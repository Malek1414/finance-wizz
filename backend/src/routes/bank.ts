import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import pool from '../db/client';
import { parsePDF } from '../services/pdfParser';
import { categorizeTransactions, applyKeywordRules } from '../services/aiCategorization';
import { RawTransaction } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRequest extends Request {
  parsedTransactions: RawTransaction[];
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function mapRow(row: any) {
  return {
    id: row.id,
    date: row.date,
    merchant: row.merchant,
    amount: parseFloat(row.amount),
    type: row.type,
    autoCategory: row.auto_category,
    userCategory: row.user_category,
    isRecurring: row.is_recurring,
    recurringFrequency: row.recurring_frequency,
    confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : null,
    createdAt: row.created_at
  };
}

function mergeWithCategories(rawTransactions: RawTransaction[], categorized: any[]) {
  const categorizedMap = new Map(categorized.map((c: any) => [c.id, c]));
  return rawTransactions.map(t => {
    const aiData = categorizedMap.get(t.id) || {};
    return {
      ...t,
      autoCategory: aiData.category || (t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING'),
      userCategory: aiData.category || (t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING'),
      isRecurring: aiData.isRecurring || false,
      recurringFrequency: aiData.recurringFrequency || null,
      confidenceScore: aiData.confidence || 0.5
    };
  });
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// parsePDFMiddleware runs after multer — parses the uploaded PDF and attaches
// the raw transactions to req.parsedTransactions before the route handler fires.
async function parsePDFMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.file) {
    return next(Object.assign(new Error('No file uploaded'), { status: 400 }));
  }

  try {
    const transactions = await parsePDF(req.file.buffer);

    if (transactions.length === 0) {
      return next(Object.assign(
        new Error('No transactions found in PDF. Please ensure it is a valid bank statement.'),
        { status: 422 }
      ));
    }

    (req as ParsedRequest).parsedTransactions = transactions;
    console.log(`[parsePDFMiddleware] parsed ${transactions.length} transactions from ${req.file.originalname}`);
    next();
  } catch (err) {
    next(err);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/bank/upload
// multer → parsePDFMiddleware → categorize → respond
router.post('/upload', upload.single('file'), parsePDFMiddleware, async (req: Request, res: Response) => {
  const rawTransactions = (req as ParsedRequest).parsedTransactions;

  let categorized: any[] = [];
  try {
    categorized = await categorizeTransactions(rawTransactions);
  } catch (aiErr) {
    console.error('AI categorization failed, using keyword/default fallback:', aiErr);
    categorized = rawTransactions.map(t => {
      const rule = applyKeywordRules(t);
      return {
        id: t.id,
        category: rule?.category ?? (t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING'),
        confidence: rule ? 0.9 : 0.4,
        isRecurring: rule?.isRecurring ?? false,
        recurringFrequency: rule?.recurringFrequency ?? null
      };
    });
  }

  const result = mergeWithCategories(rawTransactions, categorized);
  res.json({ transactions: result, count: result.length });
});

// POST /api/bank/upload/stream  (Task 3 — SSE streaming endpoint placeholder)
// Will be implemented in Task 3. Declared here so the middleware is wired in.
router.post('/upload/stream', upload.single('file'), parsePDFMiddleware, async (req: Request, res: Response) => {
  const rawTransactions = (req as ParsedRequest).parsedTransactions;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Phase 1: apply keyword rules instantly — send all transactions right away
  const withKeywords = rawTransactions.map(t => {
    const rule = applyKeywordRules(t);
    return {
      ...t,
      autoCategory: rule?.category ?? (t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING'),
      userCategory: rule?.category ?? (t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING'),
      isRecurring: rule?.isRecurring ?? false,
      recurringFrequency: rule?.recurringFrequency ?? null,
      confidenceScore: rule ? 0.95 : null,
      aiPending: !rule  // flag so frontend can show "classifying..." badge
    };
  });

  send('transactions', { transactions: withKeywords, count: withKeywords.length });

  // Phase 2: AI categorization for unmatched — stream updates as they arrive
  // (Full streaming implementation added in Task 3)
  const unmatched = rawTransactions.filter(t => !applyKeywordRules(t));

  if (unmatched.length > 0) {
    send('status', { message: `AI classifying ${unmatched.length} transactions...`, remaining: unmatched.length });

    try {
      const aiResults = await categorizeTransactions(unmatched);
      send('categories', { updates: aiResults });
    } catch (err) {
      console.error('AI categorization failed during stream:', err);
      send('categories', {
        updates: unmatched.map(t => ({
          id: t.id,
          category: t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING',
          confidence: 0.4,
          isRecurring: false,
          recurringFrequency: null
        }))
      });
    }
  }

  send('done', { total: rawTransactions.length });
  res.end();
});

// POST /api/bank/import
router.post('/import', async (req: Request, res: Response) => {
  const { transactions } = req.body;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    res.status(400).json({ error: 'transactions array is required' });
    return;
  }

  try {
    const client = await pool.connect();
    const imported: any[] = [];

    try {
      await client.query('BEGIN');

      for (const t of transactions) {
        const { rows } = await client.query(
          `INSERT INTO bank_transactions
            (date, merchant, amount, type, auto_category, user_category, is_recurring, recurring_frequency, confidence_score)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            t.date,
            t.merchant,
            t.amount,
            t.type,
            t.autoCategory || t.userCategory,
            t.userCategory || t.autoCategory,
            t.isRecurring || false,
            t.recurringFrequency || null,
            t.confidenceScore || null
          ]
        );
        imported.push(mapRow(rows[0]));

        await client.query(
          `INSERT INTO merchant_categories (merchant_pattern, category)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [t.merchant.substring(0, 50), t.userCategory || t.autoCategory]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ imported: imported.length, transactions: imported });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

// DELETE /api/bank/transactions
router.delete('/transactions', async (_req: Request, res: Response) => {
  try {
    await pool.query('TRUNCATE bank_transactions, merchant_categories RESTART IDENTITY');
    res.json({ message: 'All transactions cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear transactions' });
  }
});

// GET /api/bank/transactions
router.get('/transactions', async (req: Request, res: Response) => {
  const { limit = '100', offset = '0', type, category } = req.query;

  try {
    let query = 'SELECT * FROM bank_transactions WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (type) {
      query += ` AND type = $${paramIdx++}`;
      params.push(type);
    }
    if (category) {
      query += ` AND (user_category = $${paramIdx} OR auto_category = $${paramIdx})`;
      paramIdx++;
      params.push(category);
    }

    query += ` ORDER BY date DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const { rows } = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM bank_transactions');

    res.json({
      transactions: rows.map(mapRow),
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// PUT /api/bank/transactions/:id
router.put('/transactions/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userCategory, isRecurring, recurringFrequency } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE bank_transactions
       SET user_category = COALESCE($1, user_category),
           is_recurring = COALESCE($2, is_recurring),
           recurring_frequency = COALESCE($3, recurring_frequency)
       WHERE id = $4
       RETURNING *`,
      [userCategory, isRecurring, recurringFrequency, id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json(mapRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

export default router;
