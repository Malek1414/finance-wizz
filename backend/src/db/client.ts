import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/finance_wizz',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function initDB() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  // Insert default finance tree if empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM finance_nodes');
  if (parseInt(rows[0].count) === 0) {
    await seedDefaultData();
  }
}

async function seedDefaultData() {
  // Create root balance node
  const rootResult = await pool.query(
    `INSERT INTO finance_nodes (name, type, value, parent_id, is_editable, sort_order)
     VALUES ('Total Balance', 'BALANCE', 0, NULL, false, 0)
     RETURNING id`
  );
  const rootId = rootResult.rows[0].id;

  // Create main branches
  const branches = [
    { name: 'Income', type: 'INCOME', value: 0, sort_order: 0 },
    { name: 'Fixed Costs', type: 'FIXED_COSTS', value: 0, sort_order: 1 },
    { name: 'Variable Spending', type: 'VARIABLE_SPENDING', value: 0, sort_order: 2 },
    { name: 'Shopping Budget', type: 'SHOPPING', value: 0, sort_order: 3 }
  ];

  for (const branch of branches) {
    const branchResult = await pool.query(
      `INSERT INTO finance_nodes (name, type, value, parent_id, is_editable, sort_order)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING id`,
      [branch.name, branch.type, branch.value, rootId, branch.sort_order]
    );
    const branchId = branchResult.rows[0].id;

    let children: { name: string; value: number }[] = [];

    if (branch.type === 'INCOME') {
      children = [
        { name: 'Salary', value: 0 },
        { name: 'Freelance', value: 0 },
        { name: 'Investments', value: 0 }
      ];
    } else if (branch.type === 'FIXED_COSTS') {
      children = [
        { name: 'Rent', value: 0 },
        { name: 'Utilities', value: 0 },
        { name: 'Insurance', value: 0 },
        { name: 'Subscriptions', value: 0 }
      ];
    } else if (branch.type === 'VARIABLE_SPENDING') {
      children = [
        { name: 'Groceries', value: 0 },
        { name: 'Dining Out', value: 0 },
        { name: 'Transport', value: 0 },
        { name: 'Entertainment', value: 0 }
      ];
    } else if (branch.type === 'SHOPPING') {
      children = [
        { name: 'Sports', value: 0 },
        { name: 'Clothing', value: 0 },
        { name: 'Accessories', value: 0 },
        { name: 'Supplements', value: 0 }
      ];
    }

    for (let i = 0; i < children.length; i++) {
      await pool.query(
        `INSERT INTO finance_nodes (name, type, value, parent_id, is_editable, sort_order)
         VALUES ($1, $2, $3, $4, true, $5)`,
        [children[i].name, branch.type, children[i].value, branchId, i]
      );
    }
  }
}

export default pool;
