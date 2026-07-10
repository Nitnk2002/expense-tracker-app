import { Share, ToastAndroid } from 'react-native';
import { Expense } from '../context/ExpenseContext';

export const exportToCSV = async (expenses: Expense[]) => {
  if (!expenses || expenses.length === 0) {
    ToastAndroid.show('No expenses to export!', ToastAndroid.SHORT);
    return;
  }

  try {
    // 1. Create CSV Header
    let csvString = 'Date,Merchant,Category,Amount,Currency\n';

    // 2. Iterate through expenses and append rows
    expenses.forEach((expense) => {
      // Escape commas and quotes for CSV compatibility
      const safeMerchant = `"${(expense.merchant || '').replace(/"/g, '""')}"`;
      const safeCategory = `"${(expense.category || '').replace(/"/g, '""')}"`;
      
      const dateStr = expense.created_at ? new Date(expense.created_at).toISOString().split('T')[0] : 'Unknown Date';
      const amountStr = expense.amount.toFixed(2);
      
      csvString += `${dateStr},${safeMerchant},${safeCategory},${amountStr},${expense.currency}\n`;
    });

    // 3. Share the CSV string payload directly using Native Share
    const shareOptions = {
      title: 'Export Expenses (CSV)',
      message: csvString,
    };

    const result = await Share.share(shareOptions);
    
    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        // shared with activity type of result.activityType
        console.log("Shared with", result.activityType);
      } else {
        // shared
        console.log("Successfully Shared");
      }
    } else if (result.action === Share.dismissedAction) {
      // dismissed
      console.log("Share dismissed");
    }
  } catch (error) {
    console.error('Error generating CSV:', error);
    ToastAndroid.show('Failed to export data', ToastAndroid.SHORT);
  }
};
