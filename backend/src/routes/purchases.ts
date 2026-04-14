import { Router, Request, Response } from 'express';
import pool from '../db/client';

const router = Router();

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    brand: row.brand,
    colorway: row.colorway,
    estimatedPrice: row.estimated_price ? parseFloat(row.estimated_price) : null,
    targetPrice: row.target_price ? parseFloat(row.target_price) : null,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    lastPriceFetch: row.last_price_fetch,
    currentBestPrice: row.current_best_price ? parseFloat(row.current_best_price) : null,
    productLink: row.product_link,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/purchases
router.get('/', async (req: Request, res: Response) => {
  const { category, status, priority } = req.query;

  try {
    let query = 'SELECT * FROM purchase_items WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (category) {
      query += ` AND category = $${paramIdx++}`;
      params.push(category);
    }
    if (status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND priority = $${paramIdx++}`;
      params.push(priority);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows.map(mapRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// POST /api/purchases
router.post('/', async (req: Request, res: Response) => {
  const {
    name, category, subcategory, brand, colorway,
    estimatedPrice, targetPrice, priority = 'MEDIUM',
    status = 'WISHLIST', notes, productLink
  } = req.body;

  if (!name || !category) {
    res.status(400).json({ error: 'name and category are required' });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO purchase_items
        (name, category, subcategory, brand, colorway, estimated_price, target_price, priority, status, notes, product_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, category, subcategory, brand, colorway, estimatedPrice, targetPrice, priority, status, notes, productLink]
    );
    res.status(201).json(mapRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
});

// PUT /api/purchases/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name, category, subcategory, brand, colorway,
    estimatedPrice, targetPrice, priority, status, notes, productLink
  } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM purchase_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const r = existing.rows[0];
    const { rows } = await pool.query(
      `UPDATE purchase_items SET
        name = $1, category = $2, subcategory = $3, brand = $4,
        colorway = $5, estimated_price = $6, target_price = $7,
        priority = $8, status = $9, notes = $10, product_link = $11,
        updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        name ?? r.name,
        category ?? r.category,
        subcategory ?? r.subcategory,
        brand ?? r.brand,
        colorway ?? r.colorway,
        estimatedPrice ?? r.estimated_price,
        targetPrice ?? r.target_price,
        priority ?? r.priority,
        status ?? r.status,
        notes ?? r.notes,
        productLink ?? r.product_link,
        id
      ]
    );
    res.json(mapRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update purchase' });
  }
});

// DELETE /api/purchases/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT id FROM purchase_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    await pool.query('DELETE FROM purchase_items WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete purchase' });
  }
});

// POST /api/purchases/:id/refresh-price
router.post('/:id/refresh-price', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM purchase_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const item = existing.rows[0];

    // Mock price refresh (in production, scrape idealo.de or similar)
    const basePrice = parseFloat(item.estimated_price) || 100;
    const variance = (Math.random() - 0.3) * 0.4; // -30% to +10% of base
    const mockPrice = Math.max(basePrice * (1 + variance), basePrice * 0.5);
    const currentBestPrice = Math.round(mockPrice * 100) / 100;

    const { rows } = await pool.query(
      `UPDATE purchase_items
       SET current_best_price = $1, last_price_fetch = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [currentBestPrice, id]
    );

    res.json({
      ...mapRow(rows[0]),
      priceRefreshed: true,
      previousPrice: parseFloat(item.current_best_price) || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to refresh price' });
  }
});

export default router;
