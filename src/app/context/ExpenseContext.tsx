import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, EXPENSE_API_BASE_URL } from '../api/apiClient';
import { AuthContext } from './AuthContext';

export interface Expense {
  id: string;
  category: string;
  amount: number;
  merchant: string;
  currency: string;
  created_at?: string;
}

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  refreshExpenses: () => Promise<void>;
  addExpenseLocally: (expense: Partial<Expense>) => void;
  updateExpenseLocally: (expense: Expense) => void;
  removeExpenseLocally: (id: string) => void;
}

export const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [],
  loading: false,
  refreshExpenses: async () => {},
  addExpenseLocally: () => {},
  updateExpenseLocally: () => {},
  removeExpenseLocally: () => {},
});

export const ExpenseProvider = ({ children }: { children: ReactNode }) => {
  const { userId } = useContext(AuthContext);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Load from local storage immediately on mount
  useEffect(() => {
    const loadCache = async () => {
      if (!userId) return;
      try {
        const cached = await AsyncStorage.getItem(`@expenses_${userId}`);
        if (cached) {
          setExpenses(JSON.parse(cached));
          setLoading(false); // We have cached data, hide loading spinner
        }
      } catch (err) {
        console.error('Failed to load cached expenses', err);
      }
    };
    loadCache();
  }, [userId]);

  // 2. Fetch fresh data from backend
  const refreshExpenses = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await apiClient(`/expense/v1/?userId=${userId}`, {
        method: 'GET',
        baseUrl: EXPENSE_API_BASE_URL,
      });

      if (response.ok) {
        const data = await response.json();
        
        let deletedSet = new Set<string>();
        try {
          const tombStones = await AsyncStorage.getItem(`@deleted_expenses_${userId}`);
          if (tombStones) {
            deletedSet = new Set(JSON.parse(tombStones));
          }
        } catch (e) {}

        const mappedExpenses = data.map((exp: any, index: number) => {
          const strAmount = String(exp.amount || "0");
          const isNegative = strAmount.includes('-');
          const match = strAmount.match(/\d+(\.\d+)?/);
          let parsedAmount = match ? parseFloat(match[0]) : 0;
          if (isNegative) parsedAmount = -parsedAmount;
          
          return {
            id: exp.external_id || index.toString(),
            category: exp.category || 'General',
            amount: parsedAmount,
            merchant: exp.merchant || 'Unknown Merchant',
            currency: exp.currency || 'INR',
            created_at: exp.created_at,
          };
        }).filter((exp: Expense) => !deletedSet.has(`${exp.merchant}_${exp.amount}`));
        
        setExpenses(mappedExpenses);
        // Overwrite local cache with fresh data
        await AsyncStorage.setItem(`@expenses_${userId}`, JSON.stringify(mappedExpenses));
      }
    } catch (err) {
      console.error('Error syncing expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 3. Trigger sync when userId changes (i.e. user logs in)
  useEffect(() => {
    if (userId) {
      refreshExpenses();
    } else {
      setExpenses([]); // clear memory when logged out
    }
  }, [userId, refreshExpenses]);

  // 4. Optimistic UI update
  const addExpenseLocally = (newExp: Partial<Expense>) => {
    const defaultExp: Expense = {
      id: newExp.id || Date.now().toString(),
      category: newExp.category || 'General',
      amount: newExp.amount || 0,
      merchant: newExp.merchant || 'Unknown',
      currency: newExp.currency || 'INR',
      created_at: newExp.created_at || new Date().toISOString(),
    };
    
    // Add to top of list
    const updated = [defaultExp, ...expenses];
    setExpenses(updated);
    
    // Update local cache
    if (userId) {
      AsyncStorage.setItem(`@expenses_${userId}`, JSON.stringify(updated)).catch(console.error);
    }
  };

  const updateExpenseLocally = (updatedExp: Expense) => {
    const updated = expenses.map(exp => exp.id === updatedExp.id ? updatedExp : exp);
    setExpenses(updated);
    if (userId) {
      AsyncStorage.setItem(`@expenses_${userId}`, JSON.stringify(updated)).catch(console.error);
    }
  };

  const removeExpenseLocally = async (id: string) => {
    const expToDelete = expenses.find(exp => exp.id === id);
    if (expToDelete && userId) {
      // Backend is broken and doesn't support deleting by ID properly.
      // So we use a composite key tombstone to soft-delete it locally.
      const compositeKey = `${expToDelete.merchant}_${expToDelete.amount}`;
      try {
        const tombStones = await AsyncStorage.getItem(`@deleted_expenses_${userId}`);
        const deletedSet = new Set(tombStones ? JSON.parse(tombStones) : []);
        deletedSet.add(compositeKey);
        await AsyncStorage.setItem(`@deleted_expenses_${userId}`, JSON.stringify(Array.from(deletedSet)));
      } catch (err) {
        console.warn('Failed to save tombstone', err);
      }
    }

    const updated = expenses.filter(exp => exp.id !== id);
    setExpenses(updated);
    if (userId) {
      AsyncStorage.setItem(`@expenses_${userId}`, JSON.stringify(updated)).catch(console.error);
    }
  };

  return (
    <ExpenseContext.Provider value={{ expenses, loading, refreshExpenses, addExpenseLocally, updateExpenseLocally, removeExpenseLocally }}>
      {children}
    </ExpenseContext.Provider>
  );
};
