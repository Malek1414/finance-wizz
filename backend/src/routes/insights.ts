import { Router, Request, Response } from 'express';
import pool from '../db/client';

const router = Router();

// GET /api/insights
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Total income and expenses (all time or current month)
    const totalsResult = await pool.query(`
      SELECT
        type,
        SUM(amount) as total
      FROM bank_transactions
      GROUP BY type
    `);

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of totalsResult.rows) {
      if (row.type === 'INCOME') totalIncome = parseFloat(row.total);
      else totalExpenses += parseFloat(row.total);
    }

    const remaining = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((remaining / totalIncome) * 100) : 0;

    // Spending by category
    const categoryResult = await pool.query(`
      SELECT
        COALESCE(user_category, auto_category, 'Uncategorized') as category,
        SUM(amount) as total
      FROM bank_transactions
      WHERE type = 'EXPENSE'
      GROUP BY COALESCE(user_category, auto_category, 'Uncategorized')
      ORDER BY total DESC
    `);

    const spendingByCategory = categoryResult.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.total)
    }));

    // Monthly history (last 6 months)
    const monthlyResult = await pool.query(`
      SELECT
        TO_CHAR(date, 'YYYY-MM') as month,
        type,
        SUM(amount) as total
      FROM bank_transactions
      WHERE date >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM'), type
      ORDER BY month ASC
    `);

    const monthlyMap: Record<string, { income: number; expenses: number }> = {};
    for (const row of monthlyResult.rows) {
      if (!monthlyMap[row.month]) monthlyMap[row.month] = { income: 0, expenses: 0 };
      if (row.type === 'INCOME') monthlyMap[row.month].income = parseFloat(row.total);
      else monthlyMap[row.month].expenses += parseFloat(row.total);
    }

    const monthlyHistory = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses
    }));

    // Top merchants by spending
    const merchantResult = await pool.query(`
      SELECT
        merchant,
        SUM(amount) as total,
        COUNT(*) as count
      FROM bank_transactions
      WHERE type = 'EXPENSE'
      GROUP BY merchant
      ORDER BY total DESC
      LIMIT 10
    `);

    const topMerchants = merchantResult.rows.map(row => ({
      merchant: row.merchant,
      total: parseFloat(row.total),
      count: parseInt(row.count)
    }));

    // Recurring expenses
    const recurringResult = await pool.query(`
      SELECT * FROM bank_transactions
      WHERE is_recurring = true AND type = 'EXPENSE'
      ORDER BY amount DESC
    `);

    const recurringExpenses = recurringResult.rows.map(row => ({
      id: row.id,
      date: row.date,
      merchant: row.merchant,
      amount: parseFloat(row.amount),
      type: row.type,
      autoCategory: row.auto_category,
      userCategory: row.user_category,
      isRecurring: row.is_recurring,
      recurringFrequency: row.recurring_frequency
    }));

    // Financial health score (0-100)
    // Based on: savings rate (40%), expense diversity (30%), recurring vs variable ratio (30%)
    let healthScore = 0;

    // Savings component (40 points max)
    if (savingsRate >= 30) healthScore += 40;
    else if (savingsRate >= 20) healthScore += 30;
    else if (savingsRate >= 10) healthScore += 20;
    else if (savingsRate >= 0) healthScore += 10;

    // Expense diversity (30 points) - more categories = better tracking
    const categoryCount = spendingByCategory.length;
    if (categoryCount >= 5) healthScore += 30;
    else if (categoryCount >= 3) healthScore += 20;
    else if (categoryCount >= 1) healthScore += 10;

    // Transaction history completeness (30 points)
    const txCountResult = await pool.query('SELECT COUNT(*) FROM bank_transactions');
    const txCount = parseInt(txCountResult.rows[0].count);
    if (txCount >= 50) healthScore += 30;
    else if (txCount >= 20) healthScore += 20;
    else if (txCount >= 5) healthScore += 10;

    // Purchase wishlist affordability
    const wishlistResult = await pool.query(`
      SELECT SUM(COALESCE(target_price, estimated_price, 0)) as total_wishlist
      FROM purchase_items
      WHERE status IN ('WISHLIST', 'PLANNED')
    `);
    const totalWishlist = parseFloat(wishlistResult.rows[0].total_wishlist || '0');

    // Current month income from finance nodes
    const financeResult = await pool.query(`
      SELECT value FROM finance_nodes WHERE type = 'INCOME' AND parent_id IS NULL
    `);

    res.json({
      totalIncome,
      totalExpenses,
      remaining,
      savingsRate: Math.round(savingsRate * 10) / 10,
      spendingByCategory,
      monthlyHistory,
      healthScore: Math.min(100, healthScore),
      topMerchants,
      recurringExpenses,
      wishlistAffordability: {
        totalWishlistCost: totalWishlist,
        canAfford: remaining >= totalWishlist,
        shortfall: Math.max(0, totalWishlist - remaining)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// GET /api/insights/monthly - current month summary
router.get('/monthly', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        type,
        COALESCE(user_category, auto_category, 'Uncategorized') as category,
        SUM(amount) as total,
        COUNT(*) as count
      FROM bank_transactions
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
        AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY type, COALESCE(user_category, auto_category, 'Uncategorized')
    `);

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    const categories: Record<string, number> = {};

    for (const row of result.rows) {
      if (row.type === 'INCOME') monthlyIncome += parseFloat(row.total);
      else {
        monthlyExpenses += parseFloat(row.total);
        categories[row.category] = (categories[row.category] || 0) + parseFloat(row.total);
      }
    }

    res.json({
      income: monthlyIncome,
      expenses: monthlyExpenses,
      net: monthlyIncome - monthlyExpenses,
      categories: Object.entries(categories).map(([cat, amount]) => ({ category: cat, amount }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch monthly insights' });
  }
});

export default router;
