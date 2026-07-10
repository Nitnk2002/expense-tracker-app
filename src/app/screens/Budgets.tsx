import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ToastAndroid, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ExpenseContext } from '../context/ExpenseContext';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FadeInView } from '../components/FadeInView';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { apiClient, EXPENSE_API_BASE_URL } from '../api/apiClient';
import { ArrowLeft } from 'lucide-react-native';

const Budgets = ({ navigation }: any) => {
  const { userId } = useContext(AuthContext);
  const { expenses } = useContext(ExpenseContext);
  const { colors } = useTheme();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState(['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'General', 'Salary']);
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBudgetsAndCategories();
  }, [userId]);

  const fetchBudgetsAndCategories = async () => {
    try {
      // Fetch Custom Categories
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

      // Fetch Budgets
      const budgetsRes = await apiClient(`/expense/v1/budgets?userId=${userId}`, {
        baseUrl: EXPENSE_API_BASE_URL,
        method: 'GET'
      });
      if (budgetsRes.ok) {
        setBudgets(await budgetsRes.json());
      }
    } catch (e) {
      console.warn('Failed to load budgets', e);
    }
  };

  const handleSaveBudget = async () => {
    if (!editingCategory || !editAmount) return;
    
    setIsSaving(true);
    try {
      const response = await apiClient('/expense/v1/budgets', {
        baseUrl: EXPENSE_API_BASE_URL,
        method: 'POST',
        body: JSON.stringify({ 
          userId, 
          categoryName: editingCategory, 
          amountLimit: parseFloat(editAmount) 
        })
      });

      if (response.ok) {
        ToastAndroid.show('Budget saved!', ToastAndroid.SHORT);
        setEditingCategory(null);
        setEditAmount('');
        fetchBudgetsAndCategories();
      } else {
        ToastAndroid.show('Failed to save budget', ToastAndroid.SHORT);
      }
    } catch (e) {
      ToastAndroid.show('Network error', ToastAndroid.SHORT);
    } finally {
      setIsSaving(false);
    }
  };

  const getSpentAmount = (categoryName: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return expenses
      .filter(e => {
        const d = new Date(e.created_at);
        return e.category === categoryName && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getBudgetLimit = (categoryName: string) => {
    const b = budgets.find(b => b.categoryName === categoryName);
    return b ? b.amountLimit : 0;
  };

  const renderBudgetCard = (category: string) => {
    const spent = getSpentAmount(category);
    const limit = getBudgetLimit(category);
    const hasLimit = limit > 0;
    
    // Only calculate progress if spent > 0 to avoid NaNs, cap at 1
    const progress = hasLimit ? Math.min(spent / limit, 1) : 0;
    const isExceeded = hasLimit && spent > limit;
    
    // Check if we are currently editing this category
    const isEditing = editingCategory === category;

    return (
      <Card variant="soft" style={styles.card} key={category}>
        <View style={styles.cardHeader}>
          <Typography variant="bodyMdStrong">{category}</Typography>
          {!isEditing && (
            <TouchableOpacity onPress={() => { setEditingCategory(category); setEditAmount(hasLimit ? limit.toString() : ''); }}>
              <Typography variant="captionStrong" style={{ color: colors.primary }}>{hasLimit ? 'EDIT' : 'SET LIMIT'}</Typography>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.input, { borderColor: colors.hairlineStrong, color: colors.ink }]}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="Enter monthly limit"
              placeholderTextColor={colors.mute}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setEditingCategory(null)}>
                <Typography style={{ color: colors.mute }}>Cancel</Typography>
              </TouchableOpacity>
              <Button title={isSaving ? "Saving..." : "Save"} onPress={handleSaveBudget} disabled={isSaving} style={styles.saveBtn} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <Typography variant="bodySm" style={{ color: colors.mute }}>
                Spent: <Typography style={{ color: colors.ink }}>${spent.toFixed(2)}</Typography>
              </Typography>
              <Typography variant="bodySm" style={{ color: colors.mute }}>
                Limit: <Typography style={{ color: colors.ink }}>{hasLimit ? `$${limit.toFixed(2)}` : 'None'}</Typography>
              </Typography>
            </View>
            
            {hasLimit && (
              <View style={[styles.progressBarBg, { backgroundColor: colors.canvasSoft2 }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${progress * 100}%`,
                      backgroundColor: isExceeded ? '#EF4444' : colors.primary
                    }
                  ]} 
                />
              </View>
            )}
            {isExceeded && (
              <Typography variant="caption" style={{ color: '#EF4444', marginTop: spacing.xs }}>
                You have exceeded your monthly budget for {category}.
              </Typography>
            )}
          </>
        )}
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
          <Typography variant="displayMd">Monthly Budgets</Typography>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <FadeInView delay={100}>
            <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>ACTIVE BUDGETS</Typography>
            {categoriesList.filter(c => getBudgetLimit(c) > 0).length === 0 && (
              <Typography variant="bodySm" style={{ color: colors.mute, marginBottom: spacing.lg, fontStyle: 'italic' }}>
                You haven't set any budgets yet. Set a limit below to start tracking your goals!
              </Typography>
            )}
            {categoriesList.filter(c => getBudgetLimit(c) > 0).map(cat => renderBudgetCard(cat))}
          </FadeInView>

          <FadeInView delay={200}>
            <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute, marginTop: spacing.xl }]}>ALL CATEGORIES</Typography>
            {categoriesList.filter(c => getBudgetLimit(c) === 0).map(cat => renderBudgetCard(cat))}
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
  sectionTitle: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 8,
    borderRadius: rounded.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rounded.full,
  },
  editContainer: {
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionBtn: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  saveBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    minWidth: 100,
  }
});

export default Budgets;
