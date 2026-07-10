import React, { useState, useContext, useMemo } from 'react';
import { View, StyleSheet, SectionList, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpenseContext, Expense } from '../context/ExpenseContext';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { FadeInView } from '../components/FadeInView';
import { Search, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react-native';
import dayjs from 'dayjs';
import { spacing, rounded } from '../theme/tokens';

const CATEGORIES = ['All', 'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'General', 'Salary'];
const TYPES = [
  { label: 'All', value: 'all' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' },
];

export const Transactions = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { expenses, loading, refreshExpenses } = useContext(ExpenseContext);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshExpenses();
    setIsRefreshing(false);
  };

  const filteredAndGroupedExpenses = useMemo(() => {
    const filtered = expenses.filter(exp => {
      const matchSearch = 
        exp.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategory === 'All' || exp.category === selectedCategory;
      
      const isExpense = exp.amount < 0;
      const matchType = 
        selectedType === 'all' ||
        (selectedType === 'expense' && isExpense) ||
        (selectedType === 'income' && !isExpense);

      return matchSearch && matchCategory && matchType;
    });

    const groups: Record<string, Expense[]> = {};
    filtered.forEach(exp => {
      const dateStr = dayjs(exp.created_at || exp.createdAt || new Date()).format('YYYY-MM-DD');
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(exp);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(date => {
      let title = date;
      const todayStr = dayjs().format('YYYY-MM-DD');
      const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

      if (date === todayStr) {
        title = 'Today';
      } else if (date === yesterdayStr) {
        title = 'Yesterday';
      } else {
        title = dayjs(date).format('MMMM D, YYYY');
      }

      return {
        title,
        data: groups[date],
      };
    });
  }, [expenses, searchQuery, selectedCategory, selectedType]);

  const dynamicStyles = {
    screen: {
      flex: 1,
      backgroundColor: colors.canvasSoft,
    },
    header: {
      backgroundColor: colors.canvas,
      borderBottomColor: colors.hairline,
    },
    searchContainer: {
      backgroundColor: colors.canvas,
      borderBottomColor: colors.hairline,
    },
    searchInputWrapper: {
      backgroundColor: colors.canvasSoft2,
      borderColor: colors.border,
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
    sectionHeader: {
      backgroundColor: colors.canvasSoft,
    },
    borderBottom: {
      borderBottomColor: colors.hairline,
    },
  };

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={[styles.sectionHeader, dynamicStyles.sectionHeader]}>
      <Typography variant="captionMono" style={{ color: colors.mute }}>{title}</Typography>
    </View>
  );

  const renderItem = ({ item }: { item: Expense }) => {
    const isIncome = item.amount > 0;
    const absAmount = Math.abs(item.amount);
    const amountColor = isIncome ? colors.success : colors.error;
    const prefix = isIncome ? '+' : '-';

    return (
      <TouchableOpacity 
        style={[styles.listItem, dynamicStyles.borderBottom]}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
      >
        <View style={styles.leftCol}>
          <View style={[styles.iconWrapper, { backgroundColor: `${isIncome ? colors.success : colors.error}10` }]}>
            {isIncome ? (
              <ArrowDownLeft color={colors.success} size={18} />
            ) : (
              <ArrowUpRight color={colors.error} size={18} />
            )}
          </View>
          <View>
            <Typography variant="bodyMdStrong">{item.merchant}</Typography>
            <Typography variant="caption" style={{ color: colors.mute }}>{item.category}</Typography>
          </View>
        </View>
        <Typography variant="bodyMdStrong" style={{ color: amountColor }}>
          {prefix}₹{absAmount.toFixed(2)}
        </Typography>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={dynamicStyles.screen} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <Typography variant="displayMd">Transactions</Typography>
      </View>

      {/* Search Bar Container */}
      <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
        <View style={[styles.searchInputWrapper, dynamicStyles.searchInputWrapper]}>
          <Search color={colors.mute} size={20} style={{ marginRight: spacing.sm }} />
          <TextInput
            placeholder="Search transactions..."
            placeholderTextColor={colors.mute}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {/* Type Filter Row */}
        <View style={styles.typeFilterRow}>
          {TYPES.map(type => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typePill,
                selectedType === type.value ? { backgroundColor: colors.ink } : { backgroundColor: colors.canvasSoft2 }
              ]}
              onPress={() => setSelectedType(type.value as any)}
            >
              <Typography 
                variant="caption" 
                style={{ 
                  color: selectedType === type.value ? colors.canvas : colors.text,
                  fontWeight: '600'
                }}
              >
                {type.label}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories Horizontal Scroll */}
        <View style={styles.categoriesWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  dynamicStyles.filterPill,
                  selectedCategory === item && dynamicStyles.filterPillActive
                ]}
                onPress={() => setSelectedCategory(item)}
              >
                <Typography 
                  variant="caption" 
                  style={[
                    { color: colors.text, fontWeight: '500' },
                    selectedCategory === item && dynamicStyles.filterPillTextActive
                  ]}
                >
                  {item}
                </Typography>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.categoriesScrollContent}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={filteredAndGroupedExpenses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Calendar color={colors.mute} size={48} style={{ marginBottom: spacing.md }} />
              <Typography variant="bodyMd" style={{ color: colors.mute, textAlign: 'center' }}>
                No transactions found matching your filters.
              </Typography>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  typeFilterRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  typePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: rounded.full,
    marginRight: spacing.sm,
  },
  categoriesWrapper: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.lg,
  },
  categoriesScrollContent: {
    paddingHorizontal: spacing.lg,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: rounded.full,
    marginRight: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
  },
});

export default Transactions;
