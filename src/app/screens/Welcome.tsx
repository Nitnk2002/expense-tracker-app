import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Moon, Sun, MessageSquareText, Pencil, PieChart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeInView } from '../components/FadeInView';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { spacing } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

const Welcome = ({ navigation }: any) => {
  const { colors, isDarkMode, setThemeMode } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: colors.canvasSoft2 }]}
          onPress={() => setThemeMode(isDarkMode ? 'light' : 'dark')}
        >
          {isDarkMode ? (
            <Sun color={colors.text} size={20} />
          ) : (
            <Moon color={colors.text} size={20} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <View style={styles.content}>
          <FadeInView delay={0}>
            <Logo />
          </FadeInView>
          <FadeInView delay={100}>
            <Typography variant="displayLg" style={styles.title}>
              Expense AI
            </Typography>
          </FadeInView>
          
          <View style={styles.features}>
            <FadeInView delay={200}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                  <MessageSquareText color={colors.onPrimary} size={20} />
                </View>
                <View style={styles.featureText}>
                  <Typography variant="bodyMdStrong">Passive AI Capture</Typography>
                  <Typography variant="caption" style={{ color: colors.mute }}>Automatically parses bank SMS so you never manually log.</Typography>
                </View>
              </View>
            </FadeInView>

            <FadeInView delay={300}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                  <Pencil color={colors.onPrimary} size={20} />
                </View>
                <View style={styles.featureText}>
                  <Typography variant="bodyMdStrong">Active Capture</Typography>
                  <Typography variant="caption" style={{ color: colors.mute }}>Easily add manual expense entries when paying with cash.</Typography>
                </View>
              </View>
            </FadeInView>

            <FadeInView delay={400}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                  <PieChart color={colors.onPrimary} size={20} />
                </View>
                <View style={styles.featureText}>
                  <Typography variant="bodyMdStrong">Unified Dashboard</Typography>
                  <Typography variant="caption" style={{ color: colors.mute }}>A single mobile surface for all your tracking and insights.</Typography>
                </View>
              </View>
            </FadeInView>
          </View>
        </View>

        <FadeInView delay={500} style={styles.actions}>
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('SignUp')}
            style={styles.primaryButton}
          />
          <Button
            title="Log In"
            variant="secondary"
            onPress={() => navigation.navigate('Login')}
          />
        </FadeInView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  themeToggle: {
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  features: {
    marginTop: spacing.xl,
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  actions: {
    paddingBottom: spacing.lg,
  },
  primaryButton: {
    marginBottom: spacing.md,
  },
});

export default Welcome;
