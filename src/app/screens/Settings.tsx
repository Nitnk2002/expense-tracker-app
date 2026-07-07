import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Switch, TouchableOpacity, TextInput, ScrollView, Alert, ToastAndroid, LayoutAnimation, UIManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { FadeInView } from '../components/FadeInView';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/Logo';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Settings = ({ navigation }: any) => {
  const { logout, userId } = useContext(AuthContext);
  const { colors, isDarkMode, toggleTheme, themeMode, setThemeMode } = useTheme();
  
  // States
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isLogoutDialogVisible, setIsLogoutDialogVisible] = useState(false);
  
  // Profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notifications state
  const [budgetAlerts, setBudgetAlerts] = useState(false);
  const [billReminders, setBillReminders] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const syncVal = await AsyncStorage.getItem(`@auto_sync_${userId}`);
        if (syncVal !== null) setAutoSyncEnabled(syncVal === 'true');

        const profileVal = await AsyncStorage.getItem(`@profile_${userId}`);
        if (profileVal) {
          const profile = JSON.parse(profileVal);
          setName(profile.name || '');
          setEmail(profile.email || '');
          setPhone(profile.phone || '');
        } else {
          // Default mock values
          setName(userId || 'User');
          setEmail(`${userId || 'user'}@example.com`);
        }

        const notifVal = await AsyncStorage.getItem(`@notifs_${userId}`);
        if (notifVal) {
          const notifs = JSON.parse(notifVal);
          setBudgetAlerts(notifs.budgetAlerts || false);
          setBillReminders(notifs.billReminders || false);
        }
      } catch (e) {
        console.warn('Failed to load settings', e);
      }
    };
    if (userId) loadSettings();
  }, [userId]);

  const toggleAutoSync = async (value: boolean) => {
    setAutoSyncEnabled(value);
    try {
      await AsyncStorage.setItem(`@auto_sync_${userId}`, value.toString());
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await AsyncStorage.setItem(`@profile_${userId}`, JSON.stringify({ name, email, phone }));
      // Simulate network request since backend endpoint doesn't exist yet
      setTimeout(() => {
        setIsSavingProfile(false);
        ToastAndroid.show('Profile updated locally.', ToastAndroid.SHORT);
      }, 500);
    } catch (e) {
      console.warn('Failed to save profile', e);
      setIsSavingProfile(false);
    }
  };

  const toggleNotification = async (key: 'budgetAlerts' | 'billReminders', value: boolean) => {
    if (key === 'budgetAlerts') setBudgetAlerts(value);
    if (key === 'billReminders') setBillReminders(value);
    
    try {
      const newNotifs = {
        budgetAlerts: key === 'budgetAlerts' ? value : budgetAlerts,
        billReminders: key === 'billReminders' ? value : billReminders,
      };
      await AsyncStorage.setItem(`@notifs_${userId}`, JSON.stringify(newNotifs));
    } catch (e) {
      console.warn('Failed to save notifications', e);
    }
  };

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleLogout = () => {
    setIsLogoutDialogVisible(false);
    logout();
  };

  const dynamicStyles = {
    screen: {
      flex: 1,
      backgroundColor: colors.canvasSoft,
    },
    header: {
      padding: spacing.lg,
      paddingTop: spacing.xl,
      backgroundColor: colors.canvas,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    },
    sectionTitle: {
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
      color: colors.mute,
      marginLeft: spacing.xs,
    },
    subRow: {
      borderBottomColor: colors.hairline,
    },
    expandedContent: {
      borderTopColor: colors.hairline,
    },
    input: {
      borderColor: colors.hairlineStrong,
      color: colors.ink,
      backgroundColor: colors.canvas,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.screen}>
      <FadeInView delay={0} style={dynamicStyles.header}>
        <Typography variant="displayMd">Settings</Typography>
      </FadeInView>

      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Appearance Settings */}
        <FadeInView delay={100}>
          <Typography variant="captionMono" style={dynamicStyles.sectionTitle}>APPEARANCE</Typography>
          <Card variant="soft" style={styles.card}>
          <View style={styles.themeOptionsContainer}>
            <Typography variant="bodyMdStrong" style={{ marginBottom: spacing.md }}>Theme Options</Typography>
            <View style={[styles.themeOptions, { backgroundColor: colors.canvasSoft2 }]}>
              {(['system', 'light', 'dark'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeOptionButton,
                    themeMode === mode && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setThemeMode(mode)}
                >
                  <Typography
                    variant="bodySmStrong"
                    style={{
                      color: themeMode === mode ? colors.onPrimary : colors.text,
                      textTransform: 'capitalize'
                    }}
                  >
                    {mode}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>
        </FadeInView>

        {/* Sync Settings */}
        <FadeInView delay={200}>
          <Typography variant="captionMono" style={dynamicStyles.sectionTitle}>PREFERENCES</Typography>
          <Card variant="soft" style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Typography variant="bodyMdStrong">Auto-Sync SMS</Typography>
              <Typography variant="caption" style={{ color: colors.mute }}>
                Scan inbox for new bank messages in background.
              </Typography>
            </View>
            <Switch
              value={autoSyncEnabled}
              onValueChange={toggleAutoSync}
              trackColor={{ false: colors.canvas, true: colors.primary }}
              thumbColor={colors.onPrimary}
            />
          </View>
        </Card>
        </FadeInView>

        {/* Account Profile */}
        <FadeInView delay={300}>
          <Typography variant="captionMono" style={dynamicStyles.sectionTitle}>ACCOUNT</Typography>
          <Card variant="soft" style={styles.card}>
          <TouchableOpacity onPress={() => toggleSection('profile')} style={styles.row}>
            <View>
              <Typography variant="bodyMdStrong">Account Profile</Typography>
              <Typography variant="caption" style={{ color: colors.mute }}>Name, email, and phone number</Typography>
            </View>
          </TouchableOpacity>
          
          {expandedSection === 'profile' && (
            <View style={[styles.expandedContent, dynamicStyles.expandedContent]}>
              <Typography variant="caption" style={[styles.label, { color: colors.body }]}>Full Name</Typography>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.mute}
              />
              
              <Typography variant="caption" style={[styles.label, { color: colors.body }]}>Email Address</Typography>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.mute}
              />
              
              <Typography variant="caption" style={[styles.label, { color: colors.body }]}>Phone Number</Typography>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                placeholderTextColor={colors.mute}
              />
              
              <View style={{ marginTop: spacing.md }}>
                <Button 
                  title={isSavingProfile ? "Saving..." : "Save Profile"} 
                  onPress={handleSaveProfile} 
                  disabled={isSavingProfile}
                />
              </View>
            </View>
          )}
          </Card>
        </FadeInView>

        {/* Notifications */}
        <FadeInView delay={400}>
          <Typography variant="captionMono" style={dynamicStyles.sectionTitle}>ALERTS</Typography>
          <Card variant="soft" style={styles.card}>
          <TouchableOpacity onPress={() => toggleSection('notifications')} style={styles.row}>
            <View>
              <Typography variant="bodyMdStrong">Notifications</Typography>
              <Typography variant="caption" style={{ color: colors.mute }}>Push alerts and reminders</Typography>
            </View>
          </TouchableOpacity>
          
          {expandedSection === 'notifications' && (
            <View style={[styles.expandedContent, dynamicStyles.expandedContent]}>
              <View style={[styles.subRow, dynamicStyles.subRow]}>
                <View style={{ flex: 1 }}>
                  <Typography variant="bodyMdStrong">Budget Alerts</Typography>
                  <Typography variant="caption" style={{ color: colors.mute }}>Get notified when approaching category limits</Typography>
                </View>
                <Switch
                  value={budgetAlerts}
                  onValueChange={(val) => toggleNotification('budgetAlerts', val)}
                  trackColor={{ false: colors.canvas, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                />
              </View>
              <View style={[styles.subRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Typography variant="bodyMdStrong">Bill Reminders</Typography>
                  <Typography variant="caption" style={{ color: colors.mute }}>Reminders for recurring expenses</Typography>
                </View>
                <Switch
                  value={billReminders}
                  onValueChange={(val) => toggleNotification('billReminders', val)}
                  trackColor={{ false: colors.canvas, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                />
              </View>
            </View>
          )}
          </Card>
        </FadeInView>
        
        {/* Actions */}
        <FadeInView delay={500} style={{ marginTop: spacing['2xl'] }}>
          <Button title="Log Out" onPress={() => setIsLogoutDialogVisible(true)} variant="secondary" />
        </FadeInView>

      </ScrollView>

      <Dialog
        visible={isLogoutDialogVisible}
        title="Log Out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutDialogVisible(false)}
        isDestructive={true}
      />

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
  container: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  card: {
    paddingVertical: 0,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subRow: {
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  expandedContent: {
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
  },
  themeOptionsContainer: {
    paddingVertical: spacing.md,
  },
  themeOptions: {
    flexDirection: 'row',
    borderRadius: rounded.md,
    padding: 4,
  },
  themeOptionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: rounded.sm,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.xxs,
  },
  input: {
    borderWidth: 1,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
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

export default Settings;
