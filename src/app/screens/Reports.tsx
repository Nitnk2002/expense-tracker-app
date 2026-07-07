import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FadeInView } from '../components/FadeInView';
import { Logo } from '../components/Logo';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { ExpenseContext } from '../context/ExpenseContext';

interface DailySpend {
  label: string;
  amount: number;
}

interface MerchantSpend {
  merchant: string;
  amount: number;
  percentage: number;
}

const Reports = ({ navigation }: any) => {
  const { colors, isDarkMode } = useTheme();
  const { userId } = useContext(AuthContext);
  const { expenses, loading } = useContext(ExpenseContext);
  const [totalSpent, setTotalSpent] = useState(0);
  const [dailyTrend, setDailyTrend] = useState<DailySpend[]>([]);
  const [topMerchants, setTopMerchants] = useState<MerchantSpend[]>([]);

  useEffect(() => {
    processExpenses(expenses);
  }, [expenses]);

  const processExpenses = (data: any[]) => {
    let total = 0;
    const merchantMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};
    
    // Initialize last 30 days in dateMap
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[label] = 0;
    }

    data.forEach(exp => {
      const match = exp.amount ? String(exp.amount).match(/-?\d+(\.\d+)?/) : null;
      const amount = match ? parseFloat(match[0]) : 0;
      
      // Only include expenses (negative amounts) in the spending reports
      if (amount < 0) {
        const absAmount = Math.abs(amount);
        total += absAmount;

        // Merchant aggregate
        const merchant = exp.merchant || 'Unknown';
        merchantMap[merchant] = (merchantMap[merchant] || 0) + absAmount;

        // Date aggregate
        if (exp.created_at) {
          const d = new Date(exp.created_at);
          const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (dateMap[label] !== undefined) {
            dateMap[label] += absAmount;
          }
        }
      }
    });

    setTotalSpent(total);

    // Format daily trend
    const trend = Object.keys(dateMap).map(label => ({
      label,
      amount: dateMap[label],
    }));
    setDailyTrend(trend);

    // Format top merchants
    const merchants = Object.keys(merchantMap)
      .map(merchant => ({
        merchant,
        amount: merchantMap[merchant],
        percentage: total > 0 ? (merchantMap[merchant] / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5
      
    setTopMerchants(merchants);
  };

  const maxDailyAmount = Math.max(...dailyTrend.map(d => d.amount), 1);
  const CHART_WIDTH = 300;
  const CHART_HEIGHT = 150;

  // Generate SVG points for the line chart
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
      // Use default Card background so shadow renders correctly on Android
    },
    borderBottom: {
      borderBottomColor: colors.hairline,
    },
    merchantDot: {
      backgroundColor: colors.error, // Red dots for merchants
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
            {/* Total Spent Summary */}
            <Card variant="marketing" style={[styles.summaryCard, dynamicStyles.summaryCard]}>
              <Typography variant="captionMono" style={[styles.cardEyebrow, { color: colors.error }]}>TOTAL SPENT</Typography>
              <Typography variant="displayLg" style={{ color: colors.errorDeep }}>₹{totalSpent.toFixed(2)}</Typography>
            </Card>

            {/* Daily Trend Chart */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>LAST 30 DAYS</Typography>
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
                {/* X-Axis Labels (Start and End of month) */}
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

            {/* Top Merchants */}
            <View style={styles.section}>
              <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>TOP MERCHANTS</Typography>
              <Card variant="marketing" style={styles.listCard}>
                {topMerchants.length > 0 ? (
                  topMerchants.map((item, index) => (
                    <View key={index} style={[styles.listItem, index !== topMerchants.length - 1 && styles.borderBottom, index !== topMerchants.length - 1 && dynamicStyles.borderBottom]}>
                      <View style={styles.merchantInfo}>
                        <View style={[styles.merchantDot, dynamicStyles.merchantDot]} />
                        <Typography variant="bodyMdStrong">{item.merchant}</Typography>
                      </View>
                      <View style={styles.merchantStats}>
                        <Typography variant="bodyMdStrong" style={{ color: colors.error }}>₹{item.amount.toFixed(2)}</Typography>
                        <Typography variant="captionMono" style={[styles.percentageText, { color: colors.mute }]}>{item.percentage.toFixed(1)}%</Typography>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Typography variant="bodyMd" style={{ color: colors.mute }}>No merchant data available.</Typography>
                  </View>
                )}
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
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  merchantStats: {
    alignItems: 'flex-end',
  },
  percentageText: {
    marginTop: 2,
  },
  emptyState: {
    padding: spacing.lg,
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

export default Reports;
