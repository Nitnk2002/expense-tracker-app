import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, ToastAndroid } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FadeInView } from '../components/FadeInView';
import { Logo } from '../components/Logo';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { ExpenseContext } from '../context/ExpenseContext';

interface DailySpend {
  label: string;
  amount: number;
}

interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

const Reports = ({ navigation }: any) => {
  const { colors, isDarkMode } = useTheme();
  const { userId } = useContext(AuthContext);
  const { expenses, loading } = useContext(ExpenseContext);
  const [totalSpent, setTotalSpent] = useState(0);
  const [dailyTrend, setDailyTrend] = useState<DailySpend[]>([]);
  const [topCategories, setTopCategories] = useState<CategorySpend[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    processExpenses(expenses, period);
  }, [expenses, period]);

  const processExpenses = (data: any[], currentPeriod: 'week' | 'month' | 'year') => {
    let total = 0;
    const categoryMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};
    
    let daysToLookBack = 30;
    if (currentPeriod === 'week') daysToLookBack = 7;
    if (currentPeriod === 'year') daysToLookBack = 365;

    const cutoffTime = Date.now() - (daysToLookBack * 24 * 60 * 60 * 1000);

    if (currentPeriod === 'year') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        dateMap[label] = 0;
      }
    } else {
      for (let i = daysToLookBack - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateMap[label] = 0;
      }
    }

    data.forEach(exp => {
      const match = exp.amount ? String(exp.amount).match(/-?\d+(\.\d+)?/) : null;
      const amount = match ? parseFloat(match[0]) : 0;
      
      if (amount < 0) {
        const absAmount = Math.abs(amount);
        
        if (exp.created_at) {
          const d = new Date(exp.created_at);
          if (d.getTime() >= cutoffTime) {
            total += absAmount;

            const cat = exp.category || 'General';
            categoryMap[cat] = (categoryMap[cat] || 0) + absAmount;

            let label = '';
            if (currentPeriod === 'year') {
              label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            } else {
              label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            if (dateMap[label] !== undefined) {
              dateMap[label] += absAmount;
            }
          }
        }
      }
    });

    setTotalSpent(total);

    const trend = Object.keys(dateMap).map(label => ({
      label,
      amount: dateMap[label],
    }));
    setDailyTrend(trend);

    const categories = Object.keys(categoryMap)
      .map(cat => ({
        category: cat,
        amount: categoryMap[cat],
        percentage: total > 0 ? (categoryMap[cat] / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
      
    setTopCategories(categories);
  };

  const maxDailyAmount = Math.max(...dailyTrend.map(d => d.amount), 1);
  const CHART_WIDTH = 300;
  const CHART_HEIGHT = 150;

  const points = dailyTrend.map((d, index) => {
    const x = (index / Math.max(dailyTrend.length - 1, 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((d.amount / maxDailyAmount) * CHART_HEIGHT);
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `${points} ${CHART_WIDTH},${CHART_HEIGHT} 0,${CHART_HEIGHT}`;

  const dynamicStyles = {
    screen: {
      flex: 1,
      backgroundColor: colors.canvasSoft,
    },
    header: {
      backgroundColor: colors.canvas,
      borderBottomColor: colors.hairline,
    },
    summaryCard: {
    },
    borderBottom: {
      borderBottomColor: colors.hairline,
    },
    segmentedControl: {
      backgroundColor: colors.canvasSoft2,
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, dynamicStyles.header]}>
          <Typography variant="displayMd">Reports</Typography>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.container}>
            {/* Period Tabs Selector */}
            <View style={[styles.segmentedControl, dynamicStyles.segmentedControl, { marginBottom: spacing.md }]}>
              {(['week', 'month', 'year'] as const).map(p => (
                <TouchableOpacity 
                  key={p}
                  style={[styles.segment, period === p && dynamicStyles.segmentActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Typography variant="bodySmStrong" style={{ color: period === p ? colors.onPrimary : colors.ink, textTransform: 'capitalize' }}>
                    {p}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>

            {/* Total Spent Summary */}
            <Card variant="marketing" style={[styles.summaryCard, dynamicStyles.summaryCard]}>
              <Typography variant="captionMono" style={[styles.cardEyebrow, { color: colors.error }]}>TOTAL SPENT</Typography>
              <Typography variant="displayLg" style={{ color: colors.errorDeep }}>₹{totalSpent.toFixed(2)}</Typography>
            </Card>

            {/* Daily Trend Chart */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>
                  {period === 'week' ? 'LAST 7 DAYS' : period === 'year' ? 'LAST 12 MONTHS' : 'LAST 30 DAYS'}
                </Typography>
              </View>
              <Card variant="marketing" style={styles.chartCard}>
                <View style={styles.graphContainer}>
                  <Svg width="100%" height="100%" viewBox={`0 -10 ${CHART_WIDTH} ${CHART_HEIGHT + 20}`} preserveAspectRatio="none">
                    <Defs>
                      <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={colors.error} stopOpacity="0.3" />
                        <Stop offset="1" stopColor={colors.error} stopOpacity="0" />
                      </LinearGradient>
                    </Defs>
                    <Polyline points={fillPoints} fill="url(#grad)" stroke="none" />
                    <Polyline 
                      points={points} 
                      fill="none" 
                      stroke={colors.error} 
                      strokeWidth="3" 
                      strokeLinejoin="round" 
                      strokeLinecap="round" 
                    />
                  </Svg>
                </View>
                {/* X-Axis Labels (Start and End of period) */}
                <View style={styles.xAxisLabels}>
                  <Typography variant="caption" style={{ color: colors.mute }}>
                    {dailyTrend.length > 0 ? dailyTrend[0].label : ''}
                  </Typography>
                  <Typography variant="caption" style={{ color: colors.mute }}>
                    {dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1].label : ''}
                  </Typography>
                </View>
              </Card>
            </View>

            {/* Category Breakdown */}
            <View style={styles.section}>
              <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>CATEGORY BREAKDOWN</Typography>
              <Card variant="marketing" style={styles.listCard}>
                {topCategories.length > 0 ? (
                  topCategories.map((item, index) => (
                    <View key={index} style={[styles.listItem, index !== topCategories.length - 1 && styles.borderBottom, index !== topCategories.length - 1 && dynamicStyles.borderBottom]}>
                      <View style={{ flex: 1, marginRight: spacing.md }}>
                        <View style={styles.categoryHeader}>
                          <Typography variant="bodyMdStrong">{item.category}</Typography>
                          <Typography variant="bodyMdStrong" style={{ color: colors.error }}>₹{item.amount.toFixed(2)}</Typography>
                        </View>
                        {/* Progress Bar */}
                        <View style={[styles.progressBarBg, { backgroundColor: colors.canvasSoft2 }]}>
                          <View style={[styles.progressBarFill, { width: `${item.percentage}%`, backgroundColor: colors.primary }]} />
                        </View>
                      </View>
                      <Typography variant="captionMono" style={[styles.percentageText, { color: colors.mute, width: 40, textAlign: 'right' }]}>{item.percentage.toFixed(0)}%</Typography>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Typography variant="bodyMd" style={{ color: colors.mute }}>No category data available.</Typography>
                  </View>
                )}
              </Card>
            </View>

            {/* Export Card */}
            <View style={styles.section}>
              <Card variant="marketing" style={styles.exportCard}>
                <Typography variant="bodyMdStrong" style={{ marginBottom: spacing.xs }}>Export Transaction History</Typography>
                <Typography variant="caption" style={{ color: colors.mute, marginBottom: spacing.md }}>
                  Download all your records in a CSV spreadsheet format.
                </Typography>
                <Button 
                  title="Export CSV Report" 
                  onPress={() => ToastAndroid.show('CSV Report exported successfully!', ToastAndroid.LONG)} 
                  variant="secondary"
                />
              </Card>
            </View>
          </View>
        )}
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
  centerContainer: {
    padding: spacing['4xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  cardEyebrow: {
    marginBottom: spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  chartCard: {
    padding: spacing.md,
  },
  graphContainer: {
    height: 150,
    width: '100%',
    overflow: 'hidden',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressBarBg: {
    height: 6,
    borderRadius: rounded.full,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rounded.full,
  },
  percentageText: {
    marginTop: 2,
  },
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  exportCard: {
    padding: spacing.lg,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: rounded.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: rounded.sm,
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

export default Reports;
