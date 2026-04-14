import Anthropic from '@anthropic-ai/sdk';
import { RawTransaction } from '../types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function categorizeTransactions(transactions: RawTransaction[]) {
  const prompt = `You are a financial transaction categorizer. Categorize each transaction into one of these categories:
- INCOME: salary, freelance payments, transfers received, interest
- FIXED_COSTS: rent, utilities, insurance, regular subscriptions (Netflix, Spotify, etc.)
- VARIABLE_SPENDING: groceries, dining, transport, entertainment, healthcare
- SHOPPING: clothing, sports gear, accessories, supplements, electronics

Also detect if a transaction is likely recurring (happens monthly/weekly/yearly).

Transactions to categorize (JSON):
${JSON.stringify(transactions.map(t => ({
  id: t.id,
  merchant: t.merchant,
  amount: t.amount,
  type: t.type,
  date: t.date
})), null, 2)}

Respond ONLY with a JSON array (no other text):
[{ "id": "...", "category": "INCOME|FIXED_COSTS|VARIABLE_SPENDING|SHOPPING", "confidence": 0.0-1.0, "isRecurring": true|false, "recurringFrequency": "MONTHLY"|"WEEKLY"|"YEARLY"|null }]`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI');

  // Extract JSON array from response
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in AI response');

  const result = JSON.parse(jsonMatch[0]);

  // Validate structure
  if (!Array.isArray(result)) throw new Error('AI response is not an array');

  return result.map((item: any) => ({
    id: item.id,
    category: item.category || 'VARIABLE_SPENDING',
    confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
    isRecurring: Boolean(item.isRecurring),
    recurringFrequency: item.recurringFrequency || null
  }));
}

export async function suggestCategory(merchant: string, amount: number): Promise<string> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Categorize this transaction into one of: INCOME, FIXED_COSTS, VARIABLE_SPENDING, SHOPPING.
Merchant: "${merchant}", Amount: ${amount}
Respond with ONLY the category name, nothing else.`
      }]
    });

    const content = message.content[0];
    if (content.type !== 'text') return 'VARIABLE_SPENDING';

    const category = content.text.trim().toUpperCase();
    const validCategories = ['INCOME', 'FIXED_COSTS', 'VARIABLE_SPENDING', 'SHOPPING'];
    return validCategories.includes(category) ? category : 'VARIABLE_SPENDING';
  } catch {
    return 'VARIABLE_SPENDING';
  }
}
