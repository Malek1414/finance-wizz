import { Router, Request, Response } from 'express';
import multer from 'multer';
import pool from '../db/client';
import { parsePDF } from '../services/pdfParser';
import { categorizeTransactions } from '../services/aiCategorization';

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

// POST /api/bank/upload - parse PDF and return AI-categorized transactions preview
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    // Parse PDF
    const rawTransactions = await parsePDF(req.file.buffer);

    if (rawTransactions.length === 0) {
      res.status(422).json({
        error: 'No transactions found in PDF. Please ensure it is a valid bank statement.'
      });
      return;
    }

    // AI categorization
    let categorized: any[] = [];
    try {
      categorized = await categorizeTransactions(rawTransactions);
    } catch (aiErr) {
      console.error('AI categorization failed, using defaults:', aiErr);
      // Fallback: basic categorization
      categorized = rawTransactions.map(t => ({
        id: t.id,
        category: t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING',
        confidence: 0.5,
        isRecurring: false,
        recurringFrequency: null
      }));
    }

    // Merge raw transactions with AI categories
    const categorizedMap = new Map(categorized.map((c: any) => [c.id, c]));
    const result = rawTransactions.map(t => {
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

    res.json({ transactions: result, count: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process bank statement' });
  }
});

// POST /api/bank/import - save confirmed transactions
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

        // Update merchant_categories for future reference
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

// PUT /api/bank/transactions/:id - update user category
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
