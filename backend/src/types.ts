export interface FinanceNode {
  id: string;
  name: string;
  type: 'BALANCE' | 'INCOME' | 'FIXED_COSTS' | 'VARIABLE_SPENDING' | 'SHOPPING';
  value: number;
  children: FinanceNode[];
  parentId: string | null;
  isEditable: boolean;
  sortOrder?: number;
}

export interface PurchaseItem {
  id: string;
  name: string;
  category: 'SPORTS' | 'CLOTHING' | 'ACCESSORIES' | 'SUPPLEMENTS';
  subcategory: string;
  brand: string;
  colorway: string;
  estimatedPrice: number;
  targetPrice: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'WISHLIST' | 'PLANNED' | 'PURCHASED';
  notes: string;
  lastPriceFetch: Date | null;
  currentBestPrice: number | null;
  productLink: string | null;
}

export interface BankTransaction {
  id: string;
  date: Date;
  merchant: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  autoCategory: string;
  userCategory: string;
  isRecurring: boolean;
  recurringFrequency: 'MONTHLY' | 'WEEKLY' | 'YEARLY' | null;
  confidenceScore?: number;
}

export interface RawTransaction {
  id: string;
  date: Date;
  merchant: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
}

export interface MerchantCategory {
  id: string;
  merchantPattern: string;
  category: string;
  occurrenceCount: number;
}

export interface InsightsSummary {
  totalIncome: number;
  totalExpenses: number;
  remaining: number;
  savingsRate: number;
  spendingByCategory: { category: string; amount: number }[];
  monthlyHistory: { month: string; income: number; expenses: number }[];
  healthScore: number;
  topMerchants: { merchant: string; total: number; count: number }[];
  recurringExpenses: BankTransaction[];
}
