import pdfParse from 'pdf-parse';
import { claudeParsePDF } from './claudeClient';

interface ParsedTransaction {
  id: string;
  date: Date;
  merchant: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  transactionType?: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function parseGermanAmount(str: string): number {
  const cleaned = str.replace(/^-/, '').trim();
  return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
}

// ─── Layer 1: Sparkasse-specific regex parser ─────────────────────────────────

// Line starts with DD.MM.YYYY immediately followed by the transaction type
const TRANSACTION_START = /^(\d{2}\.\d{2}\.\d{4})(.*)/;

// Amount line: 8+ leading spaces, optional minus, German number format
const AMOUNT_LINE = /^\s{8,}(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

const SKIP_PATTERNS = [
  /^Kontostand/i,
  /^Sparkasse\s+Aachen/i,
  /^Friedrich-Wilhelm/i,
  /^Anstalt des/i,
  /^Sparkassen-Finanzgruppe/i,
  /^Vorstand:/i,
  /^HRA \d+/i,
  /^Telefon \+/i,
  /^www\./i,
  /^info@/i,
  /^SWIFT-Adresse/i,
  /^BLZ:/i,
  /^USt-IdNr/i,
  /^Seite \d+/i,
  /^Kontoauszug \d+/i,
  /^Privatgirokonto/i,
  /^DatumErl/i,
  /^Betrag Soll/i,
  /^Herrn?$/i,
  /^S\s*$/,
];

function shouldSkip(line: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(line.trim()));
}

function extractMerchant(descLines: string[], transactionType: string): string {
  const typeLower = transactionType.toLowerCase();

  if (typeLower.includes('bargeldeinzahlung')) return 'Bargeldeinzahlung';
  if (typeLower.includes('entgeltabrechnung')) return 'Sparkasse Kontoführung';
  if (typeLower.includes('abrechnung')) return 'Sparkasse Abrechnung';
  if (typeLower.includes('zinsen')) return 'Sparkasse Zinsen';

  if (descLines.length === 0) return transactionType || 'Unknown';

  if (descLines.some(l => l.includes('ovpay.nl') || l.includes('Stationsplein'))) {
    return 'OV-Pay (NS)';
  }

  let raw = descLines[0];
  raw = raw.replace(/^LS\s+/, '');
  const beforeSlash = raw.split('/')[0].trim();
  const firstLineStartsWithSlash = raw.trimStart().startsWith('/');
  let merchantBase = (!firstLineStartsWithSlash && beforeSlash.length >= 3)
    ? beforeSlash
    : (descLines[1]?.split('/')[0].trim() ?? beforeSlash);

  let merchant = merchantBase
    .replace(/Kd-Nr\.?:?\s*[\d\s,]+/gi, '')
    .replace(/Rg-Nr\.?:?\s*[\d\s\/]+/gi, '')
    .replace(/\s*-\s*RN:.*$/gi, '')
    .replace(/[A-Z0-9]{16,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (typeLower.includes('gutschrift')) {
    const nameMatch = merchant.match(/^([A-ZÄÖÜ][A-ZÄÖÜ\s\-\.]*?)(?=\s+[A-ZÄÖÜ][a-zäöüß]|$)/);
    if (nameMatch && nameMatch[1].trim().length > 2) merchant = nameMatch[1].trim();
  }

  if (merchant.length < 3) {
    merchant = raw.replace(/[A-Z0-9]{16,}/g, '').replace(/\s{2,}/g, ' ').trim().substring(0, 80);
  }

  return merchant.substring(0, 255) || 'Unknown';
}

function extractSparkasse(text: string): ParsedTransaction[] {
  const lines = text.split('\n');
  const transactions: ParsedTransaction[] = [];

  interface Block {
    dateStr: string;
    transactionType: string;
    descLines: string[];
    amountStr: string;
  }

  let current: Block | null = null;

  const finaliseBlock = (block: Block) => {
    if (!block.amountStr) return;

    const [day, month, year] = block.dateStr.split('.');
    const date = new Date(`${year}-${month}-${day}`);
    if (isNaN(date.getTime())) return;

    const isNegative = block.amountStr.startsWith('-');
    const amount = parseGermanAmount(block.amountStr);
    if (isNaN(amount) || amount <= 0) return;

    const cleanType = block.transactionType.replace(/\s*\/\s*Wert:.*$/i, '').trim();
    const merchant = extractMerchant(block.descLines, cleanType);

    transactions.push({
      id: generateId(),
      date,
      merchant,
      amount,
      type: isNegative ? 'EXPENSE' : 'INCOME',
      transactionType: cleanType || undefined
    });
  };

  for (const line of lines) {
    if (shouldSkip(line)) continue;

    const startMatch = line.match(TRANSACTION_START);
    const amountMatch = line.match(AMOUNT_LINE);

    if (startMatch) {
      if (current) finaliseBlock(current);
      current = {
        dateStr: startMatch[1],
        transactionType: startMatch[2].trim(),
        descLines: [],
        amountStr: ''
      };
    } else if (amountMatch && current) {
      current.amountStr = amountMatch[1];
      finaliseBlock(current);
      current = null;
    } else if (current && line.trim().length > 0) {
      current.descLines.push(line.trim());
    }
  }

  if (current) finaliseBlock(current);

  return transactions;
}

// ─── Layer 2: Claude native PDF parsing (any bank format) ─────────────────────

async function extractWithClaude(buffer: Buffer): Promise<ParsedTransaction[]> {
  const prompt = `You are a bank statement parser. Extract ALL transactions from this bank statement PDF.

For each transaction identify:
- date (format: YYYY-MM-DD)
- merchant (the payee/sender name, cleaned up — no reference codes or long alphanumeric strings)
- amount (always positive number, no currency symbol)
- type: "EXPENSE" if money left the account, "INCOME" if money came in
- transactionType (the transaction method: e.g. "Lastschrift", "Überweisung", "Gutschrift", "Kartenzahlung", etc.)

Return ONLY valid JSON, no explanation:
{"transactions":[{"date":"YYYY-MM-DD","merchant":"string","amount":0.00,"type":"EXPENSE","transactionType":"string"}]}`;

  const responseText = await claudeParsePDF(buffer, prompt);
  const raw = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in Claude response');
    parsed = JSON.parse(match[0]);
  }

  const items: any[] = Array.isArray(parsed) ? parsed : (parsed.transactions ?? []);
  if (!Array.isArray(items) || items.length === 0) throw new Error('No transactions in Claude response');

  return items
    .filter(item => item.date && item.merchant && item.amount != null)
    .map(item => {
      const date = new Date(item.date);
      if (isNaN(date.getTime())) return null;
      const amount = Math.abs(parseFloat(item.amount));
      if (isNaN(amount) || amount <= 0) return null;
      return {
        id: generateId(),
        date,
        merchant: String(item.merchant || 'Unknown').substring(0, 255).trim() || 'Unknown',
        amount,
        type: item.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        transactionType: item.transactionType || undefined
      } as ParsedTransaction;
    })
    .filter((t): t is ParsedTransaction => t !== null);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  // Layer 1: try Sparkasse-specific regex (fast, free, accurate for Sparkasse)
  try {
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length > 20) {
      const sparkasseResults = extractSparkasse(data.text);
      if (sparkasseResults.length > 0) {
        console.log(`[pdfParser] Sparkasse regex extracted ${sparkasseResults.length} transactions`);
        return sparkasseResults;
      }
      console.log('[pdfParser] Sparkasse regex found nothing — falling back to Claude');
    }
  } catch (err) {
    console.error('[pdfParser] pdf-parse failed:', err);
  }

  // Layer 2: Claude native PDF understanding (works for any bank)
  console.log('[pdfParser] Sending PDF to Claude for extraction...');
  const claudeResults = await extractWithClaude(buffer);
  console.log(`[pdfParser] Claude extracted ${claudeResults.length} transactions`);
  return claudeResults;
}
