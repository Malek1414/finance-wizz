import { Router, Request, Response } from 'express';
import pool from '../db/client';
import { FinanceNode } from '../types';

const router = Router();

// Build tree recursively from flat rows
function buildTree(rows: any[], parentId: string | null = null): FinanceNode[] {
  return rows
    .filter(row => row.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      value: parseFloat(row.value),
      parentId: row.parent_id,
      isEditable: row.is_editable,
      sortOrder: row.sort_order,
      children: buildTree(rows, row.id)
    }));
}

// Recalculate parent value as sum of children, walk up to root
async function recalculateAncestors(nodeId: string): Promise<void> {
  // Get the node's parent
  const nodeResult = await pool.query(
    'SELECT parent_id FROM finance_nodes WHERE id = $1',
    [nodeId]
  );

  if (nodeResult.rows.length === 0) return;
  const parentId = nodeResult.rows[0].parent_id;
  if (!parentId) return;

  // Sum children values for parent
  const sumResult = await pool.query(
    'SELECT COALESCE(SUM(value), 0) as total FROM finance_nodes WHERE parent_id = $1',
    [parentId]
  );
  const total = parseFloat(sumResult.rows[0].total);

  // Update parent value
  await pool.query(
    'UPDATE finance_nodes SET value = $1, updated_at = NOW() WHERE id = $2',
    [total, parentId]
  );

  // Recurse up
  await recalculateAncestors(parentId);
}

// GET /api/finance/nodes - returns full tree
router.get('/nodes', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM finance_nodes ORDER BY sort_order ASC'
    );
    const tree = buildTree(rows, null);
    res.json(tree[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch finance nodes' });
  }
});

// POST /api/finance/nodes - create a new node
router.post('/nodes', async (req: Request, res: Response) => {
  const { name, type, value = 0, parentId, isEditable = true } = req.body;

  if (!name || !type || !parentId) {
    res.status(400).json({ error: 'name, type, and parentId are required' });
    return;
  }

  try {
    // Get max sort_order for siblings
    const sortResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM finance_nodes WHERE parent_id = $1',
      [parentId]
    );
    const sortOrder = sortResult.rows[0].next_order;

    const { rows } = await pool.query(
      `INSERT INTO finance_nodes (name, type, value, parent_id, is_editable, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, type, value, parentId, isEditable, sortOrder]
    );

    // Recalculate ancestors
    await recalculateAncestors(rows[0].id);

    res.status(201).json({
      id: rows[0].id,
      name: rows[0].name,
      type: rows[0].type,
      value: parseFloat(rows[0].value),
      parentId: rows[0].parent_id,
      isEditable: rows[0].is_editable,
      sortOrder: rows[0].sort_order,
      children: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create node' });
  }
});

// PUT /api/finance/nodes/:id - update node
router.put('/nodes/:id', async (req: Request, res: Response) => {
  const nodeId = req.params.id as string;
  const { name, value } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM finance_nodes WHERE id = $1', [nodeId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    const updatedName = name !== undefined ? name : existing.rows[0].name;
    const updatedValue = value !== undefined ? value : existing.rows[0].value;

    const { rows } = await pool.query(
      `UPDATE finance_nodes
       SET name = $1, value = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [updatedName, updatedValue, nodeId]
    );

    // Recalculate ancestors
    await recalculateAncestors(nodeId);

    res.json({
      id: rows[0].id,
      name: rows[0].name,
      type: rows[0].type,
      value: parseFloat(rows[0].value),
      parentId: rows[0].parent_id,
      isEditable: rows[0].is_editable,
      sortOrder: rows[0].sort_order,
      children: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

// DELETE /api/finance/nodes/:id
router.delete('/nodes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM finance_nodes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    if (!existing.rows[0].is_editable) {
      res.status(403).json({ error: 'This node cannot be deleted' });
      return;
    }

    const parentId = existing.rows[0].parent_id;

    // Delete node (cascades to children)
    await pool.query('DELETE FROM finance_nodes WHERE id = $1', [id]);

    // Recalculate ancestors if there was a parent
    if (parentId) {
      const sumResult = await pool.query(
        'SELECT COALESCE(SUM(value), 0) as total FROM finance_nodes WHERE parent_id = $1',
        [parentId]
      );
      const total = parseFloat(sumResult.rows[0].total);
      await pool.query(
        'UPDATE finance_nodes SET value = $1, updated_at = NOW() WHERE id = $2',
        [total, parentId]
      );
      await recalculateAncestors(parentId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

// PUT /api/finance/nodes/:id/reorder
router.put('/nodes/:id/reorder', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newOrder } = req.body; // array of { id, sortOrder }

  if (!Array.isArray(newOrder)) {
    res.status(400).json({ error: 'newOrder must be an array' });
    return;
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of newOrder) {
        await client.query(
          'UPDATE finance_nodes SET sort_order = $1 WHERE id = $2',
          [item.sortOrder, item.id]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reorder nodes' });
  }
});

export default router;
