import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, ToastAndroid } from 'react-native';
import { Card } from '../components/Card';
import { FadeInView } from '../components/FadeInView';
import { Typography } from '../components/Typography';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { ExpenseContext } from '../context/ExpenseContext';
// Removed useDialog
import { apiClient, EXPENSE_API_BASE_URL } from '../api/apiClient';
import { useAutoScan } from '../hooks/useAutoScan';

const DS_API_BASE_URL = 'http://177.171.101.42:8010';

const AddExpense = ({ navigation }: any) => {
  const { colors, isDarkMode } = useTheme();
  const { userId } = useContext(AuthContext);
  const { addExpenseLocally } = useContext(ExpenseContext);
  const { scanSms, isScanning, scanProgress } = useAutoScan();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookbackDays, setLookbackDays] = useState<number>(1);

  const handleSave = async () => {
    if (!amount || !merchant) {
      ToastAndroid.show('Please enter amount and merchant', ToastAndroid.SHORT);
      return;
    }

    setLoading(true);
    try {
      const finalAmount = type === 'expense' ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount));

      const expenseData = {
        user_id: userId,
        amount: finalAmount,
        merchant: merchant,
        currency: 'INR',
        externalId: Date.now().toString()
      };

      const response = await apiClient('/expense/v1/', {
        method: 'POST',
        baseUrl: EXPENSE_API_BASE_URL,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      if (response.ok) {
        ToastAndroid.show('Transaction saved successfully!', ToastAndroid.SHORT);
        

        addExpenseLocally({
          id: expenseData.externalId,
          amount: expenseData.amount,
          merchant: expenseData.merchant,
          category: category || 'General',
          currency: expenseData.currency,
          created_at: new Date().toISOString()
        });

        setAmount('');
        setMerchant('');
        setCategory('');
      } else {
        ToastAndroid.show('Failed to save transaction', ToastAndroid.SHORT);
      }
    } catch (error) {
      ToastAndroid.show('Network error occurred', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkScan = () => {
    // Determine if it's bulk (lookback > 1)
    const isBulk = lookbackDays > 1;
    scanSms(lookbackDays, isBulk);
  };

  const dynamicStyles = {
    screen: {
      flex: 1,
      backgroundColor: colors.canvas,
    },
    header: {
      borderBottomColor: colors.hairline,
    },
    segmentedControl: {
      backgroundColor: colors.canvasSoft2,
    },
    segmentActiveExpense: {
      backgroundColor: colors.error,
    },
    segmentActiveIncome: {
      backgroundColor: colors.success,
    },
    segmentActiveScan: {
      backgroundColor: colors.primary,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <FadeInView delay={0} style={[styles.header, dynamicStyles.header]}>
          <Typography variant="displayMd">Add Transaction</Typography>
        </FadeInView>

        <View style={styles.container}>
          <FadeInView delay={100}>
            <Card variant="soft" style={styles.bulkCard}>
              <Typography variant="bodyMdStrong" style={{ marginBottom: spacing.md }}>Auto-Scan SMS</Typography>
              
              <View style={[styles.segmentedControl, dynamicStyles.segmentedControl]}>
                {[1, 7, 30].map(days => (
                  <TouchableOpacity 
                    key={days}
                    style={[styles.segment, lookbackDays === days && dynamicStyles.segmentActiveScan]}
                    onPress={() => setLookbackDays(days)}
                    disabled={isScanning}
                  >
                    <Typography variant="bodySmStrong" style={{ color: lookbackDays === days ? colors.onPrimary : colors.ink }}>
                      {days === 1 ? '1 Day' : `${days} Days`}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>

              {isScanning ? (
                <View style={styles.scanningState}>
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.sm }} />
                  <Typography variant="bodyMd">{scanProgress || 'Scanning...'}</Typography>
                </View>
              ) : (
                <Button 
                  title={`Scan Last ${lookbackDays === 1 ? 'Day' : lookbackDays + ' Days'}`} 
                  onPress={handleBulkScan} 
                  variant="outline"
                />
              )}
            </Card>
          </FadeInView>
          
          <FadeInView delay={150} style={styles.divider}>
            <Typography variant="captionMono" style={{color: colors.mute}}>OR ADD MANUALLY</Typography>
          </FadeInView>

          {/* Segmented Control */}
          <FadeInView delay={200} style={[styles.segmentedControl, dynamicStyles.segmentedControl]}>
            <TouchableOpacity 
              style={[styles.segment, type === 'expense' && dynamicStyles.segmentActiveExpense]}
              onPress={() => setType('expense')}
            >
              <Typography variant="bodySmStrong" style={{ color: type === 'expense' ? colors.onPrimary : colors.ink }}>
                Expense
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segment, type === 'income' && dynamicStyles.segmentActiveIncome]}
              onPress={() => setType('income')}
            >
              <Typography variant="bodySmStrong" style={{ color: type === 'income' ? colors.onPrimary : colors.ink }}>
                Income
              </Typography>
            </TouchableOpacity>
          </FadeInView>

          <FadeInView delay={300}>
            <Card variant="soft" style={styles.formCard}>
              <View style={styles.formGroup}>
                <Typography variant="captionMono" style={styles.label}>AMOUNT (₹)</Typography>
                <Input 
                  placeholder="0.00" 
                  value={amount} 
                  onChangeText={setAmount} 
                  keyboardType="decimal-pad" 
                  variant="lg"
                />
              </View>

              <View style={styles.formGroup}>
                <Typography variant="captionMono" style={styles.label}>
                  {type === 'expense' ? 'MERCHANT' : 'SOURCE'}
                </Typography>
                <Input 
                  placeholder={type === 'expense' ? "e.g. Swiggy" : "e.g. Salary"} 
                  value={merchant} 
                  onChangeText={setMerchant} 
                />
              </View>

              <View style={styles.formGroup}>
                <Typography variant="captionMono" style={styles.label}>CATEGORY</Typography>
                <Input 
                  placeholder="e.g. Food, Transport" 
                  value={category} 
                  onChangeText={setCategory} 
                />
              </View>

              <View style={styles.actions}>
                {loading ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                  <Button title="Save Transaction" onPress={handleSave} />
                )}
              </View>
            </Card>
          </FadeInView>
        </View>
      </ScrollView>

      {/* AI Chatbot FAB */}
      <FadeInView delay={500} style={[styles.fabContainer, { bottom: spacing.xl, right: spacing.lg }]}>
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.ink }]}
          onPress={() => (navigation as any).navigate('Chatbot')}
        >
          <Logo showText={false} size={28} color={colors.onPrimary} style={{ marginBottom: 0 }} />
        </TouchableOpacity>
      </FadeInView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
  },
  container: {
    padding: spacing.lg,
  },
  bulkCard: {
    padding: spacing.lg,
  },
  scanningState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: rounded.md,
    padding: 4,
    marginBottom: spacing.xl,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: rounded.sm,
  },
  formCard: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xxs,
    marginLeft: spacing.xxs,
  },
  actions: {
    marginTop: spacing.lg,
  },
  divider: {
    marginVertical: spacing.lg,
    alignItems: 'center',
  },
  fabContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default AddExpense;
