import { useState, useContext, useCallback } from 'react';
import { PermissionsAndroid, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmsAndroid from 'react-native-get-sms-android';
import { AuthContext } from '../context/AuthContext';
import { ExpenseContext } from '../context/ExpenseContext';
import { apiClient, EXPENSE_API_BASE_URL } from '../api/apiClient';

const DS_API_BASE_URL = 'https://nitnkumar-expense-ai.hf.space/ds';

const MERCHANT_CATEGORIES: Record<string, string> = {
  swiggy: 'Food',
  zomato: 'Food',
  starbucks: 'Food',
  mcdonald: 'Food',
  restaurant: 'Food',
  eats: 'Food',
  food: 'Food',
  uber: 'Transport',
  ola: 'Transport',
  rapido: 'Transport',
  metro: 'Transport',
  railway: 'Transport',
  cab: 'Transport',
  taxi: 'Transport',
  amazon: 'Shopping',
  flipkart: 'Shopping',
  myntra: 'Shopping',
  retail: 'Shopping',
  grocery: 'Shopping',
  supermarket: 'Shopping',
  store: 'Shopping',
  netflix: 'Entertainment',
  spotify: 'Entertainment',
  hotstar: 'Entertainment',
  prime: 'Entertainment',
  electricity: 'Bills',
  bill: 'Bills',
  insurance: 'Bills',
  recharge: 'Bills',
  telecom: 'Bills',
  hospital: 'Health',
  pharmacy: 'Health',
  clinic: 'Health',
  medical: 'Health',
  salary: 'Salary',
  employer: 'Salary',
};

const autoCategorize = (merchant: string): string => {
  const name = merchant.toLowerCase();
  for (const [key, category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (name.includes(key)) {
      return category;
    }
  }
  return 'General';
};

export const useAutoScan = () => {
  const { userId } = useContext(AuthContext);
  const { addExpenseLocally, refreshExpenses } = useContext(ExpenseContext);
  // Removed showDialog
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');

  const sendToAI = useCallback(async (messageText: string, dateMs?: number): Promise<boolean> => {
    try {
      const dateISO = dateMs ? new Date(dateMs).toISOString() : new Date().toISOString();
      const response = await fetch(`${DS_API_BASE_URL}/v1/ds/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageText, 
          user_id: userId,
          created_at: dateISO 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const strAmount = String(data.amount || "0");
        const isNegative = strAmount.includes('-');
        const match = strAmount.match(/\d+(\.\d+)?/);
        let parsedAmount = match ? parseFloat(match[0]) : 0;
        if (isNegative) parsedAmount = -parsedAmount;
        
        const merchant = data.merchant || 'AI Scanned';
        const category = data.category || autoCategorize(merchant);

        const expenseData = {
          amount: parsedAmount,
          merchant: merchant,
          category: category,
          currency: data.currency || 'INR',
          created_at: dateISO,
          user_id: userId,
          externalId: Date.now().toString()
        };

        // Post directly to backend to ensure it's saved without waiting for Kafka
        try {
          await apiClient('/expense/v1/', {
            method: 'POST',
            baseUrl: EXPENSE_API_BASE_URL,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expenseData)
          });
        } catch (postErr) {
          console.error("Failed to post auto-scanned expense to backend", postErr);
        }

        addExpenseLocally({
          id: expenseData.externalId,
          amount: parsedAmount,
          merchant: merchant,
          category: category,
          currency: expenseData.currency,
          created_at: dateISO,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [userId, addExpenseLocally]);

  const requestSmsPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'App needs access to read your SMS to scan for bank transactions.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const scanSms = useCallback(async (daysToLookBack: number = 1, bulk: boolean = false, silent: boolean = false) => {
    if (!userId) {
      console.warn('[AutoScan] Cannot scan: userId is null or empty.');
      if (!silent) {
        ToastAndroid.show('Please wait, user profile is loading...', ToastAndroid.SHORT);
      }
      return 0;
    }

    const hasPermission = await requestSmsPermission();
    if (!hasPermission) {
      if (!silent) {
        ToastAndroid.show('Permission Denied: Cannot read SMS without permission.', ToastAndroid.LONG);
      }
      return 0;
    }

    setIsScanning(true);
    let processedCount = 0;

    return new Promise<number>((resolve) => {
      const filter = {
        box: 'inbox', 
        maxCount: bulk ? 1000 : 300, // Increased limit to ensure we cover a full 24h of messages
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: any) => {
          console.log('Failed with this error: ' + fail);
          setIsScanning(false);
          resolve(0);
        },
        async (count: number, smsList: string) => {
          const messages = JSON.parse(smsList);
          
          const processedIdsRaw = await AsyncStorage.getItem(`@processed_sms_${userId}`);
          const processedIds: string[] = processedIdsRaw ? JSON.parse(processedIdsRaw) : [];
          const processedSet = new Set(processedIds);
          
          console.log(`[AutoScan] userId: ${userId}`);
          console.log(`[AutoScan] Total messages in inbox: ${messages.length}`);
          
          const bankRelated = messages.filter((m: any) => {
            const body = m.body.toLowerCase();
            return body.includes('spent') || 
                   body.includes('debited') ||
                   body.includes('card') ||
                   body.includes('received') ||
                   body.includes('sent') ||
                   body.includes('credited');
          });
          
          console.log(`[AutoScan] Bank related messages: ${bankRelated.length}`);
          bankRelated.forEach((m: any) => {
            const ageDays = (Date.now() - m.date) / (24 * 60 * 60 * 1000);
            console.log(`[AutoScan] SMS ID: ${m._id}, Date: ${new Date(m.date).toISOString()}, Age: ${ageDays.toFixed(2)} days, Body: ${m.body.substring(0, 30)}`);
          });

          const lastScanTimeRaw = await AsyncStorage.getItem(`@last_sms_time_${userId}`);
          const lastScanTime = lastScanTimeRaw ? parseInt(lastScanTimeRaw) : 0;
          
          const cutoffTime = Math.max(
             Date.now() - (daysToLookBack * 24 * 60 * 60 * 1000),
             lastScanTime
          );

          const bankMessages = messages.filter((m: any) => {
            if (processedSet.has(m._id?.toString())) return false;

            const body = m.body.toLowerCase();
            const isBankRelated = body.includes('spent') || 
                   body.includes('debited') ||
                   body.includes('card') ||
                   body.includes('received') ||
                   body.includes('sent') ||
                   body.includes('credited');
                   
            const isRecent = m.date > cutoffTime;
            
            return isBankRelated && isRecent;
          });

          if (bankMessages.length === 0) {
            if (!silent) {
              const sortedBank = [...bankRelated].sort((a, b) => b.date - a.date);
              if (sortedBank.length > 0) {
                const ageDays = (Date.now() - sortedBank[0].date) / (24 * 60 * 60 * 1000);
                ToastAndroid.show(`[User: ${userId}] No new messages in last ${daysToLookBack} day(s). Newest is ${ageDays.toFixed(1)} day(s) old.`, ToastAndroid.LONG);
              } else {
                ToastAndroid.show(`[User: ${userId}] No bank-related SMS messages found in your inbox.`, ToastAndroid.LONG);
              }
            }
            setIsScanning(false);
            resolve(0);
            return;
          }

          for (let i = 0; i < bankMessages.length; i++) {
            setScanProgress(`Processing ${i + 1} of ${bankMessages.length}...`);
            const success = await sendToAI(bankMessages[i].body, bankMessages[i].date);
            if (success) {
              processedCount++;
              processedSet.add(bankMessages[i]._id?.toString());
            }
            
            // We removed the 'if (!bulk) break;' so that a 1-day scan from UI 
            // actually processes ALL bank messages in the last 24h, not just the single most recent one.
            // If it's a silent background scan, we could potentially limit it, 
            // but the deduplication ensures we only process NEW messages anyway.
          }
          
          if (processedCount > 0) {
            await AsyncStorage.setItem(`@processed_sms_${userId}`, JSON.stringify(Array.from(processedSet)));
            
            // Save the timestamp of the newest processed message to prevent duplicate scans forever
            const sortedBank = [...bankMessages].sort((a, b) => b.date - a.date);
            if (sortedBank.length > 0) {
              const newestTimestamp = sortedBank[0].date;
              const prevMaxRaw = await AsyncStorage.getItem(`@last_sms_time_${userId}`);
              const prevMax = prevMaxRaw ? parseInt(prevMaxRaw) : 0;
              if (newestTimestamp > prevMax) {
                await AsyncStorage.setItem(`@last_sms_time_${userId}`, newestTimestamp.toString());
              }
            }
            
            // We skip calling refreshExpenses() here because it would fetch from backend 
            // before the POST might have finished, which would wipe our optimistically 
            // added expenses from the UI.
            // setTimeout(() => { refreshExpenses(); }, 1500);
            
            if (!silent) {
              ToastAndroid.show(`Successfully parsed and saved ${processedCount} expense(s)!`, ToastAndroid.LONG);
            }
          }

          setIsScanning(false);
          setScanProgress('');
          resolve(processedCount);
        }
      );
    });
  }, [userId, sendToAI, refreshExpenses]);

  return { scanSms, isScanning, scanProgress };
};
