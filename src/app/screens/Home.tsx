import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '../components/Card';
import { FadeInView } from '../components/FadeInView';
import { Typography } from '../components/Typography';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { ExpenseContext } from '../context/ExpenseContext';
import { Logo } from '../components/Logo';
import { useAutoScan } from '../hooks/useAutoScan';
import { Menu } from 'lucide-react-native';
import { Dialog } from '../components/Dialog';
import dayjs from 'dayjs';

const CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛒',
  Bills: '💸',
  Entertainment: '🎬',
  Health: '🏥',
  Salary: '💰',
  General: '📦',
};

const getRelativeTime = (dateStr?: string) => {
  if (!dateStr) return 'some time ago';
  const now = new Date();
  const created = new Date(dateStr);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return dayjs(dateStr).format('MMM D');
};

const Home = ({ navigation }: any) => {
  const { colors, isDarkMode } = useTheme();
  const { userId, logout } = useContext(AuthContext);
  const { expenses, loading } = useContext(ExpenseContext);
  const { scanSms } = useAutoScan();
  const hasAutoSynced = useRef(false);
  const [isLogoutDialogVisible, setIsLogoutDialogVisible] = useState(false);
  const [homeCategory, setHomeCategory] = useState('All');

  useEffect(() => {
    hasAutoSynced.current = false;
  }, [userId]);

  const userExpenses = expenses;

  const filteredRecentExpenses = useMemo(() => {
    return userExpenses.filter(e => {
      return homeCategory === 'All' || e.category === homeCategory;
    });
  }, [userExpenses, homeCategory]);

  const aiInsightText = useMemo(() => {
    const expensesList = userExpenses.filter(e => e.amount < 0);
    const incomeList = userExpenses.filter(e => e.amount > 0);
    
    if (expensesList.length === 0) {
      return "✨ No expenses recorded yet. Scan your SMS alerts or add transactions manually to get personalized budget insights!";
    }

    const totalExp = expensesList.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const totalInc = incomeList.reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals: Record<string, number> = {};
    expensesList.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Math.abs(e.amount);
    });

    let topCategory = '';
    let maxCatAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > maxCatAmount) {
        maxCatAmount = amt;
        topCategory = cat;
      }
    });

    const topCategoryPercent = totalExp > 0 ? Math.round((maxCatAmount / totalExp) * 100) : 0;

    if (totalExp > totalInc && totalInc > 0) {
      return `⚠️ Your total spending (₹${totalExp.toFixed(0)}) exceeds your income (₹${totalInc.toFixed(0)}) this period. We recommend reducing your ${topCategory} budget, which accounts for ${topCategoryPercent}% of your spending.`;
    }

    if (topCategoryPercent > 40) {
      return `📊 High category concentration: You've spent ${topCategoryPercent}% of your budget (₹${maxCatAmount.toFixed(0)}) on "${topCategory}" this period. Try setting a weekly spending cap on this category.`;
    }

    const largestSingle = expensesList.reduce((max, e) => Math.abs(e.amount) > Math.abs(max.amount) ? e : max, expensesList[0]);
    return `💡 Your largest single transaction was ₹${Math.abs(largestSingle.amount).toFixed(0)} at ${largestSingle.merchant}. Your overall saving rate is looking solid this period!`;
  }, [userExpenses]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Check for auto-sync on mount
  useEffect(() => {
    const runAutoSync = async () => {
      if (!userId || hasAutoSynced.current) return;
      
      try {
        const val = await AsyncStorage.getItem(`@auto_sync_${userId}`);
        if (val === 'true') {
          hasAutoSynced.current = true;
          // Silent scan, 1 day lookback, not bulk
          console.log('Running background SMS auto-sync...');
          await scanSms(1, false, true);
        }
      } catch (e) {
        console.warn('Failed to run auto-sync', e);
      }
    };
    
    runAutoSync();
  }, [userId, scanSms]);

  const [userProfile, setUserProfile] = useState({
    name: userId || 'User',
    email: `${userId || 'user'}@example.com`,
    avatarInitial: userId ? userId.charAt(0).toUpperCase() : 'U',
  });

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        if (!userId) return;
        try {
          const profileVal = await AsyncStorage.getItem(`@profile_${userId}`);
          if (profileVal) {
            const profile = JSON.parse(profileVal);
            setUserProfile({
              name: profile.name || userId || 'User',
              email: profile.email || `${userId || 'user'}@example.com`,
              avatarInitial: (profile.name || userId || 'U').charAt(0).toUpperCase(),
            });
          }
        } catch (e) {
          console.warn('Failed to load profile in Home', e);
        }
      };
      loadProfile();
    }, [userId])
  );

  const categoryDataForChart = useMemo(() => {
    const expensesList = userExpenses.filter(e => e.amount < 0);
    const totals: Record<string, number> = {};
    expensesList.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + Math.abs(e.amount);
    });
    const array = Object.entries(totals).map(([category, amount]) => ({
      category,
      amount,
    }));
    return array.sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [userExpenses]);

  const maxCategoryAmount = useMemo(() => {
    return Math.max(...categoryDataForChart.map(c => c.amount), 0);
  }, [categoryDataForChart]);

  const barAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    barAnims.forEach(anim => anim.setValue(0));
    
    const animations = categoryDataForChart.map((_, index) => {
      return Animated.timing(barAnims[index], {
        toValue: 1,
        duration: 400,
        delay: index * 60,
        useNativeDriver: false,
      });
    });

    Animated.parallel(animations).start();
  }, [categoryDataForChart]);

  const totalIncome = userExpenses.filter(e => e.amount > 0).reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpenses = userExpenses.filter(e => e.amount < 0).reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
  const maxAmount = Math.max(...userExpenses.filter(e => e.amount < 0).map(e => Math.abs(e.amount)), 0);

  const dynamicStyles = {
    screen: {
      flex: 1,
      backgroundColor: colors.canvasSoft,
    },
    navBar: {
      backgroundColor: colors.canvas,
      borderBottomColor: colors.hairline,
    },
    avatar: {
      backgroundColor: colors.ink,
    },
    heroBand: {
      backgroundColor: colors.canvas,
      borderBottomColor: colors.hairline,
    },
    summaryDivider: {
      backgroundColor: colors.hairline,
    },
    bar: {
      backgroundColor: colors.ink,
    },
    borderBottom: {
      borderBottomColor: colors.hairline,
    },
    filterPill: {
      backgroundColor: colors.canvasSoft2,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
    },
    filterPillTextActive: {
      color: colors.onPrimary,
    },
    aiInsightCard: {
      backgroundColor: colors.canvas,
      borderColor: colors.border,
      borderWidth: 1,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header / Nav Area */}
        <FadeInView delay={0} style={[styles.navBar, dynamicStyles.navBar]}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, dynamicStyles.avatar]}>
              <Typography variant="bodyMdStrong" style={{ color: colors.canvas }}>{userProfile.avatarInitial}</Typography>
            </View>
            <View>
              <Typography variant="caption" style={{ color: colors.mute }}>{getGreeting()},</Typography>
              <Typography variant="bodyLgStrong">{userProfile.name}</Typography>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Sidebar')} style={styles.logoutButton}>
            <Menu color={colors.ink} size={24} />
          </TouchableOpacity>
        </FadeInView>

        {/* Hero Band / Overview */}
        <FadeInView delay={100} style={[styles.heroBand, dynamicStyles.heroBand]}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryBox}>
              <Typography variant="captionMono" style={[styles.heroEyebrow, { color: colors.mute }]}>TOTAL INCOME</Typography>
              <Typography variant="displayMd" style={{ color: colors.success }}>
                ₹{totalIncome.toFixed(2)}
              </Typography>
            </View>
            <View style={[styles.summaryDivider, dynamicStyles.summaryDivider]} />
            <View style={styles.summaryBox}>
              <Typography variant="captionMono" style={[styles.heroEyebrow, { color: colors.mute }]}>TOTAL SPENT</Typography>
              <Typography variant="displayMd" style={{ color: colors.text }}>
                ₹{totalExpenses.toFixed(2)}
              </Typography>
            </View>
          </View>
        </FadeInView>

        <View style={styles.container}>
          {/* Expense Graph Section */}
          <FadeInView delay={200} style={styles.section}>
            <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>EXPENSE OVERVIEW</Typography>
            <Card variant="marketing" style={styles.graphCard}>
              <View style={styles.graphContainer}>
                {categoryDataForChart.length > 0 ? (
                  categoryDataForChart.map((item, index) => {
                    const barHeight = maxCategoryAmount > 0 ? (item.amount / maxCategoryAmount) * 100 : 0;
                    const animatedHeight = barAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', `${barHeight}%`],
                    });

                    return (
                      <View key={item.category} style={styles.barWrapper}>
                        <View style={styles.barChart}>
                          <Typography variant="captionMono" style={[styles.barLabel, { color: colors.mute }]}>₹{item.amount.toFixed(0)}</Typography>
                          <Animated.View style={[styles.bar, dynamicStyles.bar, { height: animatedHeight }]} />
                        </View>
                        <Typography variant="caption" style={[styles.categoryLabel, { color: colors.body }]} numberOfLines={1}>{item.category}</Typography>
                      </View>
                    );
                  })
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="bodyMd" style={{ color: colors.mute }}>
                      {loading ? 'Loading...' : 'No expenses yet.'}
                    </Typography>
                  </View>
                )}
              </View>
            </Card>

            {/* AI Insights Card */}
            <Card variant="soft" style={[styles.aiInsightCard, dynamicStyles.aiInsightCard]}>
              <View style={styles.aiInsightHeader}>
                <Logo showText={false} size={20} color={colors.primary} style={{ marginRight: spacing.xs, marginBottom: 0 }} />
                <Typography variant="bodyMdStrong" style={{ color: colors.primary }}>Expense AI Insight</Typography>
              </View>
              <Typography variant="bodyMd" style={{ marginTop: spacing.xs, color: colors.text }}>
                {aiInsightText}
              </Typography>
            </Card>
          </FadeInView>

          {/* Recent Expenses List */}
          <FadeInView delay={300} style={styles.section}>
            <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>RECENT TRANSACTIONS</Typography>
            
            {/* Category horizontal selector */}
            <View style={styles.categoriesWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
                {['All', 'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'General', 'Salary'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterPill,
                      dynamicStyles.filterPill,
                      homeCategory === cat && dynamicStyles.filterPillActive
                    ]}
                    onPress={() => setHomeCategory(cat)}
                  >
                    <Typography 
                      variant="caption" 
                      style={[
                        { color: colors.text, fontWeight: '500' },
                        homeCategory === cat && dynamicStyles.filterPillTextActive
                      ]}
                    >
                      {cat}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Card variant="marketing" style={styles.listCard}>
              {filteredRecentExpenses.length > 0 ? (
                filteredRecentExpenses.slice(0, 8).map((expense, index) => {
                  const isIncome = expense.amount > 0;
                  const absAmount = Math.abs(expense.amount);
                  const amountColor = isIncome ? colors.success : colors.error;
                  const prefix = isIncome ? '+' : '-';
                  const emoji = CATEGORY_EMOJIS[expense.category] || '📦';
                  const relativeTime = getRelativeTime(expense.created_at || expense.createdAt);

                  return (
                    <TouchableOpacity 
                      key={expense.id} 
                      style={[styles.expenseItem, index !== Math.min(filteredRecentExpenses.length, 8) - 1 && styles.borderBottom, index !== Math.min(filteredRecentExpenses.length, 8) - 1 && dynamicStyles.borderBottom]}
                      onPress={() => (navigation as any).navigate('TransactionDetail', { transaction: expense })}
                    >
                      <View style={styles.leftCol}>
                        <View style={[styles.emojiWrapper, { backgroundColor: colors.canvasSoft2 }]}>
                          <Typography style={{ fontSize: 18 }}>{emoji}</Typography>
                        </View>
                        <View>
                          <Typography variant="bodyMdStrong">{expense.merchant}</Typography>
                          <Typography variant="caption" style={{ color: colors.mute }}>
                            {expense.category} • {relativeTime}
                          </Typography>
                        </View>
                      </View>
                      <Typography variant="bodyMdStrong" style={{ color: amountColor }}>
                        {prefix}₹{absAmount.toFixed(2)}
                      </Typography>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ padding: spacing.lg }}>
                  <Typography variant="bodyMd" style={{ color: colors.mute, textAlign: 'center' }}>
                    {loading ? 'Loading...' : 'No transactions found.'}
                  </Typography>
                </View>
              )}
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

      <Dialog
        visible={isLogoutDialogVisible}
        title="Log Out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
        onConfirm={() => {
          setIsLogoutDialogVisible(false);
          logout();
        }}
        onCancel={() => setIsLogoutDialogVisible(false)}
        isDestructive={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing['4xl'],
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  appBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    marginLeft: spacing.xs,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  logoutButton: {
    padding: spacing.xs,
  },
  heroBand: {
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  summaryBox: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  heroEyebrow: {
    marginBottom: spacing.xs,
  },
  container: {
    padding: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  graphCard: {
    padding: spacing.md,
  },
  graphContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barChart: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    borderTopLeftRadius: rounded.xs,
    borderTopRightRadius: rounded.xs,
  },
  barLabel: {
    marginBottom: spacing.xxs,
    fontSize: 10,
  },
  categoryLabel: {
    marginTop: spacing.xs,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  categoriesWrapper: {
    marginBottom: spacing.md,
  },
  categoriesScroll: {
    paddingRight: spacing.lg,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: rounded.full,
    marginRight: spacing.xs,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiWrapper: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  aiInsightCard: {
    padding: spacing.md,
    marginTop: spacing.md,
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
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

export default Home;
