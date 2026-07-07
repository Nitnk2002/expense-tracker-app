import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
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

const Home = ({ navigation }: any) => {
  const { colors, isDarkMode } = useTheme();
  const { userId } = useContext(AuthContext);
  const { expenses, loading } = useContext(ExpenseContext);
  const { scanSms } = useAutoScan();
  const hasAutoSynced = useRef(false);

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

  const userExpenses = expenses;
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
  };

  return (
    <SafeAreaView style={dynamicStyles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header / Nav Area */}
        <FadeInView delay={0} style={[styles.navBar, dynamicStyles.navBar]}>
          <View style={styles.appBrand}>
            <Logo size={24} showText={false} style={{ marginBottom: 0 }} />
            <Typography variant="bodyLgStrong" style={[styles.appName, { color: colors.primary }]}>Expense AI</Typography>
          </View>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, dynamicStyles.avatar]}>
              <Typography variant="bodyMdStrong" style={{ color: colors.canvas }}>{userProfile.avatarInitial}</Typography>
            </View>
            <View>
              <Typography variant="bodyMdStrong">{userProfile.name}</Typography>
              <Typography variant="caption" style={{ color: colors.mute }}>{userProfile.email}</Typography>
            </View>
          </View>
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
                {userExpenses.filter(e => e.amount < 0).length > 0 ? (
                  userExpenses.filter(e => e.amount < 0).slice(0, 5).map(expense => {
                    const absAmount = Math.abs(expense.amount);
                    const barHeight = maxAmount > 0 ? (absAmount / maxAmount) * 100 : 0;
                    return (
                      <View key={expense.id} style={styles.barWrapper}>
                        <View style={styles.barChart}>
                          <Typography variant="captionMono" style={[styles.barLabel, { color: colors.mute }]}>₹{absAmount.toFixed(0)}</Typography>
                          <View style={[styles.bar, dynamicStyles.bar, { height: `${barHeight}%` }]} />
                        </View>
                        <Typography variant="caption" style={[styles.categoryLabel, { color: colors.body }]} numberOfLines={1}>{expense.merchant}</Typography>
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
          </FadeInView>

          {/* Recent Expenses List */}
          <FadeInView delay={300} style={styles.section}>
            <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>RECENT TRANSACTIONS</Typography>
            <Card variant="marketing" style={styles.listCard}>
              {userExpenses.length > 0 ? (
                userExpenses.map((expense, index) => {
                  const isIncome = expense.amount > 0;
                  const absAmount = Math.abs(expense.amount);
                  const amountColor = isIncome ? colors.success : colors.error;
                  const prefix = isIncome ? '+' : '-';
                  return (
                    <TouchableOpacity 
                      key={expense.id} 
                      style={[styles.expenseItem, index !== userExpenses.length - 1 && styles.borderBottom, index !== userExpenses.length - 1 && dynamicStyles.borderBottom]}
                      onPress={() => (navigation as any).navigate('TransactionDetail', { transaction: expense })}
                    >
                      <View>
                        <Typography variant="bodyMdStrong">{expense.merchant}</Typography>
                        <Typography variant="caption">{expense.category}</Typography>
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
