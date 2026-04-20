import { RawTransaction } from '../types';
import { claudeChat } from './claudeClient';

// ─── Keyword rules (fast, free, no AI needed) ─────────────────────────────────

const KEYWORD_RULES: {
  category: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  keywords: string[];
}[] = [
  {
    category: 'INCOME',
    keywords: [
      'gehalt', 'lohn', 'salary', 'gutschrift', 'überweisungsgutschrift',
      'zinsen', 'dividende', 'erstattung', 'rückzahlung', 'rückerstattung',
      'steuererstattung', 'kindergeld', 'rente'
    ]
  },
  {
    category: 'FIXED_COSTS',
    isRecurring: true,
    recurringFrequency: 'MONTHLY',
    keywords: [
      'miete', 'kaltmiete', 'warmmiete', 'nebenkosten',
      'strom', 'gas', 'stadtwerke', 'e.on', 'eon', 'innogy', 'vattenfall', 'enercity', 'naturstrom',
      'wasser', 'wasserwerke',
      'gez', 'rundfunkbeitrag', 'ard zdf',
      'versicherung', 'allianz', 'ergo', 'axa', 'huk', 'devk', 'aok', 'tk krankenkasse', 'barmer',
      'telekom', 'vodafone', 'o2', 'congstar', 'freenet', '1&1',
      'netflix', 'spotify', 'amazon prime', 'disney+', 'disney plus', 'apple one',
      'google one', 'dropbox', 'adobe', 'microsoft 365', 'office 365',
      'dauerauftrag'
    ]
  },
  {
    category: 'VARIABLE_SPENDING',
    keywords: [
      'rewe', 'edeka', 'aldi', 'lidl', 'kaufland', 'penny', 'netto', 'norma',
      'tegut', 'real', 'spar', 'nahkauf', 'hit markt', 'marktkauf',
      'dm drogerie', 'rossmann', 'müller', 'budni',
      'restaurant', 'café', 'cafe', 'bistro', 'bäckerei', 'backerei', 'konditorei',
      'mcdonald', 'burger king', 'subway', 'kfc', 'starbucks', 'nordsee',
      'doener', 'döner', 'pizza', 'sushi', 'lieferando', 'deliveroo', 'wolt',
      'uber', 'taxi', 'deutsche bahn', 'db bahn', 'db fernverkehr', 'db regio',
      'mvv', 'bvg', 'hvv', 'rnv', 'vgn', 'nahverkehr', 'öpnv',
      'tankstelle', 'shell', 'aral', 'esso', 'bp', 'total', 'jet tankstelle',
      'adac', 'parken', 'parkhaus',
      'apotheke', 'pharmacy', 'arzt', 'zahnarzt', 'krankenhaus', 'klinik',
      'kino', 'cinema', 'theater', 'konzert', 'eventim', 'ticketmaster',
      'fitnessstudio', 'fitness', 'gym', 'schwimmbad', 'bowling',
      'ov-pay', 'ovpay', 'ns '
    ]
  },
  {
    category: 'SHOPPING',
    keywords: [
      'amazon', 'zalando', 'otto', 'about you', 'asos', 'shein',
      'h&m', 'zara', 'primark', 'uniqlo', 'c&a', 'peek', 'cloppenburg',
      'hugo boss', 'tommy hilfiger', 'ralph lauren', 'levis',
      'decathlon', 'adidas', 'nike', 'puma', 'under armour', 'intersport',
      'sport scheck', "runner's point",
      'saturn', 'mediamarkt', 'apple store', 'cyberport', 'notebooksbilliger',
      'ikea', 'obi', 'bauhaus', 'hornbach', 'toom', 'hagebau',
      'myprotein', 'foodspring', 'body & fit', 'nu3', 'prozis'
    ]
  }
];

export function applyKeywordRules(
  transaction: RawTransaction
): { category: string; isRecurring: boolean; recurringFrequency: string | null } | null {
  const searchText = [transaction.merchant, transaction.transactionType ?? '']
    .join(' ')
    .toLowerCase();

  if (transaction.type === 'INCOME') {
    return { category: 'INCOME', isRecurring: false, recurringFrequency: null };
  }

  if (transaction.transactionType?.toLowerCase().includes('dauerauftrag')) {
    return { category: 'FIXED_COSTS', isRecurring: true, recurringFrequency: 'MONTHLY' };
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(kw => searchText.includes(kw))) {
      return {
        category: rule.category,
        isRecurring: rule.isRecurring ?? false,
        recurringFrequency: rule.recurringFrequency ?? null
      };
    }
  }

  return null;
}

// ─── Claude categorization (for unmatched transactions) ───────────────────────

async function categorizeWithClaude(transactions: RawTransaction[]): Promise<Map<string, any>> {
  const result = new Map<string, any>();
  if (transactions.length === 0) return result;

  const prompt = `Categorize these bank transactions into one of: INCOME, FIXED_COSTS, VARIABLE_SPENDING, SHOPPING.

Categories:
- INCOME: salary, received transfers, interest, tax refunds
- FIXED_COSTS: rent, utilities, insurance, recurring subscriptions
- VARIABLE_SPENDING: groceries, dining, transport, fuel, healthcare, entertainment
- SHOPPING: clothing, electronics, sports gear, supplements, home goods, online retail

Also detect if recurring (isRecurring: true/false) and frequency (MONTHLY/WEEKLY/YEARLY/null).

Transactions:
${JSON.stringify(transactions.map(t => ({
    id: t.id,
    merchant: t.merchant,
    amount: t.amount,
    transactionType: t.transactionType ?? ''
  })), null, 2)}

Respond with ONLY valid JSON:
{"results":[{"id":"...","category":"...","isRecurring":false,"recurringFrequency":null}]}`;

  const responseText = await claudeChat(prompt);
  const raw = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return result;
    parsed = JSON.parse(match[0]);
  }

  const items: any[] = Array.isArray(parsed) ? parsed : (parsed.results ?? parsed.transactions ?? []);
  for (const item of items) {
    if (item.id) result.set(item.id, item);
  }

  return result;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function categorizeTransactions(transactions: RawTransaction[]) {
  const categorized: any[] = [];
  const needsAI: RawTransaction[] = [];

  for (const t of transactions) {
    const ruleResult = applyKeywordRules(t);
    if (ruleResult) {
      categorized.push({
        id: t.id,
        category: ruleResult.category,
        confidence: 0.95,
        isRecurring: ruleResult.isRecurring,
        recurringFrequency: ruleResult.recurringFrequency
      });
    } else {
      needsAI.push(t);
    }
  }

  console.log(`[categorize] Keyword rules matched ${categorized.length}/${transactions.length}`);

  if (needsAI.length > 0) {
    console.log(`[categorize] Sending ${needsAI.length} transactions to Claude`);
    try {
      const aiResults = await categorizeWithClaude(needsAI);
      for (const t of needsAI) {
        const aiData = aiResults.get(t.id);
        categorized.push({
          id: t.id,
          category: aiData?.category || (t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING'),
          confidence: aiData ? 0.85 : 0.4,
          isRecurring: Boolean(aiData?.isRecurring),
          recurringFrequency: aiData?.recurringFrequency || null
        });
      }
    } catch (err) {
      console.error('[categorize] Claude failed, using defaults:', err);
      for (const t of needsAI) {
        categorized.push({
          id: t.id,
          category: t.type === 'INCOME' ? 'INCOME' : 'VARIABLE_SPENDING',
          confidence: 0.4,
          isRecurring: false,
          recurringFrequency: null
        });
      }
    }
  }

  return categorized;
}

export async function suggestCategory(merchant: string, amount: number): Promise<string> {
  const dummy: RawTransaction = { id: '', date: new Date(), merchant, amount, type: 'EXPENSE' };
  const ruleResult = applyKeywordRules(dummy);
  if (ruleResult) return ruleResult.category;

  try {
    const prompt = `Categorize this bank transaction into exactly one of: INCOME, FIXED_COSTS, VARIABLE_SPENDING, SHOPPING.
Merchant: "${merchant}", Amount: ${amount}
Respond with ONLY valid JSON: {"category":"CATEGORY_NAME"}`;

    const responseText = await claudeChat(prompt);
    const parsed = JSON.parse(responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    const category = (parsed.category || '').toUpperCase();
    const valid = ['INCOME', 'FIXED_COSTS', 'VARIABLE_SPENDING', 'SHOPPING'];
    return valid.includes(category) ? category : 'VARIABLE_SPENDING';
  } catch {
    return 'VARIABLE_SPENDING';
  }
}
