import pdfParse from 'pdf-parse';

interface ParsedTransaction {
  id: string;
  date: Date;
  merchant: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
}

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  const data = await pdfParse(buffer);
  return extractTransactions(data.text);
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function parseGermanAmount(amountStr: string): number {
  // Handle German number format: 1.234,56 -> 1234.56
  return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
}

function extractTransactions(text: string): ParsedTransaction[] {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const transactions: ParsedTransaction[] = [];

  // German date pattern: DD.MM.YYYY or DD/MM/YYYY
  const datePattern = /\b(\d{2}[.\/]\d{2}[.\/]\d{4})\b/;
  // German amount pattern: 1.234,56 or 1234,56 or -1.234,56
  const amountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})\s*(EUR|€)?/;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    const amountMatches = [...line.matchAll(new RegExp(amountPattern.source, 'g'))];

    if (!dateMatch || amountMatches.length === 0) continue;

    // Use last amount match (typically the transaction amount in bank statements)
    const lastAmountMatch = amountMatches[amountMatches.length - 1];
    const amountStr = lastAmountMatch[1];
    const amount = parseGermanAmount(amountStr);

    if (isNaN(amount)) continue;

    // Parse date
    const dateStr = dateMatch[1].replace(/\//g, '.');
    const parts = dateStr.split('.');
    if (parts.length !== 3) continue;

    const [day, month, year] = parts;
    const date = new Date(`${year}-${month}-${day}`);
    if (isNaN(date.getTime())) continue;

    // Extract merchant name (text between date and amount)
    const dateEnd = line.indexOf(dateMatch[1]) + dateMatch[1].length;
    const amountStart = line.lastIndexOf(lastAmountMatch[1]);
    let merchant = line.substring(dateEnd, amountStart).trim();

    // Clean up merchant name
    merchant = merchant
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-&./äöüÄÖÜß]/g, '')
      .trim();

    if (!merchant || merchant.length < 2) {
      // Try to extract any meaningful word before the amount
      const words = line.split(/\s+/).filter(w => w.length > 2 && !w.match(/^\d/));
      if (words.length > 0) {
        merchant = words.slice(0, 3).join(' ');
      } else {
        merchant = 'Unknown';
      }
    }

    transactions.push({
      id: generateId(),
      date,
      merchant: merchant.substring(0, 255),
      amount: Math.abs(amount),
      type: amount < 0 ? 'EXPENSE' : 'INCOME'
    });
  }

  // If standard pattern failed, try a more lenient approach
  if (transactions.length === 0) {
    return extractTransactionsLenient(text);
  }

  return transactions;
}

function extractTransactionsLenient(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  // Look for any line with a date-like pattern and a number
  const looseDatePattern = /(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/;
  const looseAmountPattern = /(\d+[,\.]\d{2})/;

  for (const line of lines) {
    const dateMatch = line.match(looseDatePattern);
    const amountMatch = line.match(looseAmountPattern);

    if (!dateMatch || !amountMatch) continue;

    const amount = parseGermanAmount(amountMatch[1].replace('.', ',').includes(',')
      ? amountMatch[1]
      : amountMatch[1] + ',00');

    if (isNaN(amount) || amount <= 0) continue;

    // Try to parse date
    const dateParts = dateMatch[1].split(/[\.\/-]/);
    if (dateParts.length < 3) continue;

    let date: Date;
    const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
    date = new Date(`${year}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`);

    if (isNaN(date.getTime())) continue;

    const merchant = line
      .replace(dateMatch[1], '')
      .replace(amountMatch[1], '')
      .replace(/EUR|€|\+|-/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 100) || 'Unknown';

    const isNegative = line.includes('-') && line.indexOf('-') < line.indexOf(amountMatch[1]);

    transactions.push({
      id: generateId(),
      date,
      merchant,
      amount,
      type: isNegative ? 'EXPENSE' : 'INCOME'
    });
  }

  return transactions;
}
