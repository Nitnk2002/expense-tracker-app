import { useState, useContext, useCallback } from 'react';
import { PermissionsAndroid, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmsAndroid from 'react-native-get-sms-android';
import { AuthContext } from '../context/AuthContext';
import { ExpenseContext } from '../context/ExpenseContext';
// Removed useDialog

const DS_API_BASE_URL = 'http://177.171.101.42:8010';

export const useAutoScan = () => {
  const { userId } = useContext(AuthContext);
  const { addExpenseLocally, refreshExpenses } = useContext(ExpenseContext);
  // Removed showDialog
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');

  const sendToAI = useCallback(async (messageText: string): Promise<boolean> => {
    try {
      const response = await fetch(`${DS_API_BASE_URL}/v1/ds/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, user_id: userId })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const strAmount = String(data.amount || "0");
        const isNegative = strAmount.includes('-');
        const match = strAmount.match(/\d+(\.\d+)?/);
        let parsedAmount = match ? parseFloat(match[0]) : 0;
        if (isNegative) parsedAmount = -parsedAmount;
        
        addExpenseLocally({
          amount: parsedAmount,
          merchant: data.merchant || 'AI Scanned',
          category: data.category || 'General',
          currency: data.currency || 'INR',
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
          
          const cutoffTime = Date.now() - (daysToLookBack * 24 * 60 * 60 * 1000);

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
              ToastAndroid.show('Could not find any new recent transaction SMS.', ToastAndroid.SHORT);
            }
            setIsScanning(false);
            resolve(0);
            return;
          }

          for (let i = 0; i < bankMessages.length; i++) {
            setScanProgress(`Processing ${i + 1} of ${bankMessages.length}...`);
            const success = await sendToAI(bankMessages[i].body);
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
            
            // Refresh from backend after a short delay to allow Kafka processing
            setTimeout(() => {
              refreshExpenses();
            }, 1500);
            
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
  }, [sendToAI]);

  return { scanSms, isScanning, scanProgress };
};
