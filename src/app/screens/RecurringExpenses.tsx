import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ToastAndroid, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FadeInView } from '../components/FadeInView';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { apiClient, EXPENSE_API_BASE_URL } from '../api/apiClient';
import { ArrowLeft, Trash2, Plus } from 'lucide-react-native';

const RecurringExpenses = ({ navigation }: any) => {
  const { userId } = useContext(AuthContext);
  const { colors } = useTheme();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState(['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'General', 'Salary']);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newMerchant, setNewMerchant] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Bills');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    if (!userId) return;
    try {
      // Fetch Categories
      const categoriesRes = await apiClient(`/expense/v1/categories?userId=${userId}`, {
        baseUrl: EXPENSE_API_BASE_URL,
        method: 'GET'
      });
      if (categoriesRes.ok) {
        const cats = await categoriesRes.json();
        if (cats && cats.length > 0) {
          const allCats = [...categoriesList];
          cats.forEach((c: any) => {
            if (!allCats.includes(c.name)) allCats.push(c.name);
          });
          setCategoriesList(allCats);
        }
      }

      // Fetch Recurring Expenses
      const recurringRes = await apiClient(`/expense/v1/recurring?userId=${userId}`, {
        baseUrl: EXPENSE_API_BASE_URL,
        method: 'GET'
      });
      if (recurringRes.ok) {
        setExpenses(await recurringRes.json());
      }
    } catch (e) {
      console.warn('Failed to load recurring expenses', e);
    }
  };

  const handleSave = async () => {
    if (!newMerchant || !newAmount) {
      ToastAndroid.show('Please enter merchant and amount', ToastAndroid.SHORT);
      return;
    }
    
    setIsSaving(true);
    try {
      // Default to one month from today for the first due date
      const nextDue = new Date();
      nextDue.setMonth(nextDue.getMonth() + 1);

      const response = await apiClient('/expense/v1/recurring', {
        baseUrl: EXPENSE_API_BASE_URL,
        method: 'POST',
        body: JSON.stringify({ 
          userId, 
          merchant: newMerchant, 
          amount: parseFloat(newAmount),
          category: newCategory,
          frequency: 'MONTHLY',
          nextDueDate: nextDue.toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        ToastAndroid.show('Recurring expense added!', ToastAndroid.SHORT);
        setIsAdding(false);
        setNewMerchant('');
        setNewAmount('');
        fetchData();
      } else {
        ToastAndroid.show('Failed to save recurring expense', ToastAndroid.SHORT);
      }
    } catch (e) {
      ToastAndroid.show('Network error', ToastAndroid.SHORT);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Bill",
      "Are you sure you want to delete this recurring expense?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiClient(`/expense/v1/recurring/${id}`, {
                baseUrl: EXPENSE_API_BASE_URL,
                method: 'DELETE'
              });
              if (res.ok) {
                ToastAndroid.show('Deleted!', ToastAndroid.SHORT);
                fetchData();
              }
            } catch (e) {
              ToastAndroid.show('Error deleting', ToastAndroid.SHORT);
            }
          }
        }
      ]
    );
  };

  const renderExpenseCard = (expense: any) => {
    const due = new Date(expense.nextDueDate);
    const dateStr = `${due.getDate()} ${due.toLocaleString('default', { month: 'short' })}`;
    
    return (
      <Card variant="soft" style={styles.card} key={expense.id}>
        <View style={styles.cardHeader}>
          <View>
            <Typography variant="bodyMdStrong">{expense.merchant}</Typography>
            <Typography variant="caption" style={{ color: colors.mute }}>{expense.category} • Monthly</Typography>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Typography variant="bodyMdStrong">${expense.amount.toFixed(2)}</Typography>
            <Typography variant="caption" style={{ color: colors.primary }}>Next due: {dateStr}</Typography>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(expense.id)}>
          <Trash2 size={16} color={colors.mute} />
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvasSoft }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={[styles.header, { backgroundColor: colors.canvas, borderBottomColor: colors.hairline }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: spacing.md }}>
            <ArrowLeft size={24} color={colors.ink} />
          </TouchableOpacity>
          <Typography variant="displayMd">Recurring Bills</Typography>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <FadeInView delay={100}>
            <View style={styles.titleRow}>
              <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>YOUR BILLS</Typography>
              {!isAdding && (
                <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)}>
                  <Plus size={16} color={colors.primary} />
                  <Typography variant="captionStrong" style={{ color: colors.primary, marginLeft: 4 }}>ADD BILL</Typography>
                </TouchableOpacity>
              )}
            </View>

            {expenses.length === 0 && !isAdding && (
              <Typography variant="bodySm" style={{ color: colors.mute, marginBottom: spacing.lg, fontStyle: 'italic' }}>
                You haven't set up any recurring expenses yet. Add one to track your monthly subscriptions!
              </Typography>
            )}

            {isAdding && (
              <Card variant="soft" style={styles.card}>
                <Typography variant="bodySmStrong" style={{ marginBottom: spacing.md }}>Add New Bill</Typography>
                
                <TextInput
                  style={[styles.input, { borderColor: colors.hairlineStrong, color: colors.ink }]}
                  value={newMerchant}
                  onChangeText={setNewMerchant}
                  placeholder="Merchant (e.g., Netflix)"
                  placeholderTextColor={colors.mute}
                  autoFocus
                />
                
                <TextInput
                  style={[styles.input, { borderColor: colors.hairlineStrong, color: colors.ink }]}
                  value={newAmount}
                  onChangeText={setNewAmount}
                  keyboardType="numeric"
                  placeholder="Amount"
                  placeholderTextColor={colors.mute}
                />

                <Typography variant="caption" style={{ color: colors.mute, marginBottom: spacing.xs, marginTop: spacing.sm }}>Category</Typography>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                  {categoriesList.map(cat => (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.catChip, { backgroundColor: newCategory === cat ? colors.primary : colors.canvasSoft2 }]}
                      onPress={() => setNewCategory(cat)}
                    >
                      <Typography variant="captionStrong" style={{ color: newCategory === cat ? colors.onPrimary : colors.text }}>{cat}</Typography>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setIsAdding(false)}>
                    <Typography style={{ color: colors.mute }}>Cancel</Typography>
                  </TouchableOpacity>
                  <Button title={isSaving ? "Saving..." : "Save Bill"} onPress={handleSave} disabled={isSaving} style={styles.saveBtn} />
                </View>
              </Card>
            )}

            {expenses.map(exp => renderExpenseCard(exp))}
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginLeft: spacing.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deleteBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: 8,
    opacity: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: rounded.full,
    marginRight: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  actionBtn: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  saveBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  }
});

export default RecurringExpenses;
