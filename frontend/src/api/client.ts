import axios from 'axios';
import { FinanceNode, PurchaseItem, BankTransaction, InsightsSummary } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Finance Nodes
export const financeApi = {
  getTree: async (): Promise<FinanceNode> => {
    const { data } = await api.get('/finance/nodes');
    return data;
  },
  createNode: async (payload: {
    name: string;
    type: string;
    value?: number;
    parentId: string;
  }): Promise<FinanceNode> => {
    const { data } = await api.post('/finance/nodes', payload);
    return data;
  },
  updateNode: async (id: string, payload: { name?: string; value?: number }): Promise<FinanceNode> => {
    const { data } = await api.put(`/finance/nodes/${id}`, payload);
    return data;
  },
  deleteNode: async (id: string): Promise<void> => {
    await api.delete(`/finance/nodes/${id}`);
  },
  reorderNodes: async (id: string, newOrder: { id: string; sortOrder: number }[]): Promise<void> => {
    await api.put(`/finance/nodes/${id}/reorder`, { newOrder });
  }
};

// Purchases
export const purchasesApi = {
  getAll: async (filters?: { category?: string; status?: string; priority?: string }): Promise<PurchaseItem[]> => {
    const { data } = await api.get('/purchases', { params: filters });
    return data;
  },
  create: async (payload: Partial<PurchaseItem>): Promise<PurchaseItem> => {
    const { data } = await api.post('/purchases', payload);
    return data;
  },
  update: async (id: string, payload: Partial<PurchaseItem>): Promise<PurchaseItem> => {
    const { data } = await api.put(`/purchases/${id}`, payload);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/purchases/${id}`);
  },
  refreshPrice: async (id: string): Promise<PurchaseItem & { priceRefreshed: boolean }> => {
    const { data } = await api.post(`/purchases/${id}/refresh-price`);
    return data;
  }
};

// Bank Transactions
export const bankApi = {
  uploadPDF: async (file: File): Promise<{ transactions: BankTransaction[]; count: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/bank/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  importTransactions: async (transactions: BankTransaction[]): Promise<{ imported: number; transactions: BankTransaction[] }> => {
    const { data } = await api.post('/bank/import', { transactions });
    return data;
  },
  getTransactions: async (params?: { limit?: number; offset?: number; type?: string; category?: string }): Promise<{
    transactions: BankTransaction[];
    total: number;
  }> => {
    const { data } = await api.get('/bank/transactions', { params });
    return data;
  },
  updateTransaction: async (id: string, payload: Partial<BankTransaction>): Promise<BankTransaction> => {
    const { data } = await api.put(`/bank/transactions/${id}`, payload);
    return data;
  },
  clearTransactions: async (): Promise<void> => {
    await api.delete('/bank/transactions');
  }
};

// Insights
export const insightsApi = {
  getSummary: async (): Promise<InsightsSummary> => {
    const { data } = await api.get('/insights');
    return data;
  },
  getMonthlySummary: async (): Promise<{ income: number; expenses: number; net: number; categories: { category: string; amount: number }[] }> => {
    const { data } = await api.get('/insights/monthly');
    return data;
  }
};

export default api;
