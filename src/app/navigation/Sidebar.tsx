import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../components/Typography';
import { spacing } from '../theme/tokens';
import { PieChart, RefreshCw, LogOut, X } from 'lucide-react-native';
import { Logo } from '../components/Logo';

const { width, height } = Dimensions.get('window');

export const Sidebar = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { userProfile, userEmail, logout } = useContext(AuthContext);

  const navTo = (screenName: string) => {
    navigation.goBack(); // Close sidebar
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.overlay}>
      {/* Dimmed Background */}
      <TouchableOpacity 
        style={styles.dimmedBackground} 
        activeOpacity={1} 
        onPress={() => navigation.goBack()}
      />
      
      {/* Sidebar Content */}
      <View style={[styles.container, { backgroundColor: colors.canvas }]}>
        
        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: colors.canvasSoft2, borderBottomColor: colors.hairline }]}>
          <View style={styles.headerTop}>
            <Logo size={24} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <X size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Typography variant="displaySm" style={{ color: colors.onPrimary }}>
                {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : 'U'}
              </Typography>
            </View>
            <View style={styles.profileText}>
              <Typography variant="bodyLgStrong">
                {userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}` : 'User Account'}
              </Typography>
              <Typography variant="caption" style={{ color: colors.mute }}>
                {userEmail || 'No email provided'}
              </Typography>
            </View>
          </View>
        </View>

        {/* Navigation Links */}
        <View style={styles.menuContainer}>
          <Typography variant="captionMono" style={[styles.sectionTitle, { color: colors.mute }]}>
            FEATURES
          </Typography>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.hairline }]} onPress={() => navTo('Budgets')}>
            <PieChart size={22} color={colors.ink} />
            <Typography variant="bodyMdStrong" style={[styles.menuText, { color: colors.ink }]}>Monthly Budgets</Typography>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.hairline }]} onPress={() => navTo('RecurringExpenses')}>
            <RefreshCw size={22} color={colors.ink} />
            <Typography variant="bodyMdStrong" style={[styles.menuText, { color: colors.ink }]}>Recurring Bills</Typography>
          </TouchableOpacity>
          
        </View>

        {/* Footer / Logout */}
        <View style={[styles.footer, { borderTopColor: colors.hairline }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <LogOut size={22} color={colors.error} />
            <Typography variant="bodyMdStrong" style={[styles.menuText, { color: colors.error }]}>Log Out</Typography>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  dimmedBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    width: width * 0.75, // 75% of screen width
    height: height,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    padding: spacing.xl,
    paddingTop: spacing['4xl'],
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profileText: {
    flex: 1,
  },
  menuContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  menuText: {
    marginLeft: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
    borderTopWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  }
});
