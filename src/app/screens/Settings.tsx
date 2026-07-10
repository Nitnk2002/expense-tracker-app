import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Switch, TouchableOpacity, TextInput, ScrollView, Alert, ToastAndroid, LayoutAnimation, UIManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { ExpenseContext } from '../context/ExpenseContext';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { FadeInView } from '../components/FadeInView';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { apiClient, EXPENSE_API_BASE_URL, AUTH_API_BASE_URL } from '../api/apiClient';
import { ChevronRight } from 'lucide-react-native';
import { Logo } from '../components/Logo';
import { exportToCSV } from '../utils/exportUtils';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Settings = ({ navigation }: any) => {
  const { logout, userId } = useContext(AuthContext);
  const { expenses } = useContext(ExpenseContext);
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

  // New States for Specification alignment
  const [currency, setCurrency] = useState('INR');
  const [categoriesList, setCategoriesList] = useState(['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'General', 'Salary']);
  const [newCategory, setNewCategory] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    if (categoriesList.includes(newCategory.trim())) {
      ToastAndroid.show('Category already exists!', ToastAndroid.SHORT);
      return;
    }
    const catName = newCategory.trim();
    
    // Save to backend
    try {
      const response = await apiClient('/expense/v1/categories', {
        baseUrl: EXPENSE_API_BASE_URL,
        method: 'POST',
        body: JSON.stringify({ name: catName, userId: userId })
      });
      
      if (response.ok) {
        setCategoriesList([...categoriesList, catName]);
        setNewCategory('');
        ToastAndroid.show('Category saved to cloud!', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('Failed to save category to cloud.', ToastAndroid.SHORT);
      }
    } catch (e) {
      ToastAndroid.show('Network error while saving category.', ToastAndroid.SHORT);
    }
  };

  // Notifications state
  const [budgetAlerts, setBudgetAlerts] = useState(false);
  const [billReminders, setBillReminders] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const syncVal = await AsyncStorage.getItem(`@auto_sync_${userId}`);
        if (syncVal !== null) setAutoSyncEnabled(syncVal === 'true');

        const notifVal = await AsyncStorage.getItem(`@notifs_${userId}`);
        if (notifVal) {
          const notifs = JSON.parse(notifVal);
          setBudgetAlerts(notifs.budgetAlerts || false);
          setBillReminders(notifs.billReminders || false);
        }

        // Fetch user profile from backend
        const profileRes = await apiClient('/auth/v1/profile', {
          baseUrl: AUTH_API_BASE_URL,
          method: 'GET'
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setName(`${profile.firstName || ''} ${profile.lastName || ''}`.trim());
          setEmail(profile.email || '');
          setPhone(profile.phoneNumber ? String(profile.phoneNumber) : '');
        } else {
          setName(userId || 'User');
          setEmail(`${userId || 'user'}@example.com`);
        }

        // Fetch categories from backend
        const categoriesRes = await apiClient(`/expense/v1/categories?userId=${userId}`, {
          baseUrl: EXPENSE_API_BASE_URL,
          method: 'GET'
        });
        if (categoriesRes.ok) {
          const cats = await categoriesRes.json();
          if (cats && cats.length > 0) {
            const allCats = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'General', 'Salary'];
            cats.forEach((c: any) => {
              if (!allCats.includes(c.name)) allCats.push(c.name);
            });
            setCategoriesList(allCats);
          }
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
      const parts = name.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
      
      const payload = {
        firstName,
        lastName,
        email,
        phone_number: phone ? parseInt(phone) : null
      };
      
      const response = await apiClient('/auth/v1/profile', {
        baseUrl: AUTH_API_BASE_URL,
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        ToastAndroid.show('Profile updated in cloud.', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('Failed to update profile.', ToastAndroid.SHORT);
      }
    } catch (e) {
      console.warn('Failed to save profile', e);
      ToastAndroid.show('Network error updating profile.', ToastAndroid.SHORT);
    } finally {
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

        {/* Preferences Settings */}
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
            <View style={[styles.subRow, { borderBottomWidth: 0, paddingVertical: spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Typography variant="bodyMdStrong">Default Currency</Typography>
                <Typography variant="caption" style={{ color: colors.mute }}>Choose default display currency.</Typography>
              </View>
              <View style={[styles.currencyOptions, { backgroundColor: colors.canvasSoft2 }]}>
                {(['INR', 'USD', 'EUR'] as const).map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.currencyOptionButton,
                      currency === curr && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setCurrency(curr)}
                  >
                    <Typography
                      variant="bodySmStrong"
                      style={{ color: currency === curr ? colors.onPrimary : colors.text }}
                    >
                      {curr}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>
        </FadeInView>

        {/* Categories Section */}
        <FadeInView delay={250}>
          <Typography variant="captionMono" style={dynamicStyles.sectionTitle}>CATEGORIES</Typography>
          <Card variant="soft" style={styles.card}>
            <TouchableOpacity onPress={() => toggleSection('categories')} style={styles.row}>
              <View>
                <Typography variant="bodyMdStrong">Manage Categories</Typography>
                <Typography variant="caption" style={{ color: colors.mute }}>View and add transaction categories</Typography>
              </View>
            </TouchableOpacity>
            
            {expandedSection === 'categories' && (
              <View style={[styles.expandedContent, dynamicStyles.expandedContent]}>
                <View style={styles.categoryChipsList}>
                  {categoriesList.map((cat) => (
                    <View key={cat} style={[styles.categoryManageChip, { backgroundColor: colors.canvasSoft2 }]}>
                      <Typography variant="captionMono" style={{ color: colors.text }}>{cat}</Typography>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', marginTop: spacing.md, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.input, dynamicStyles.input, { flex: 1, marginRight: spacing.sm }]}
                    value={newCategory}
                    onChangeText={setNewCategory}
                    placeholder="New category name..."
                    placeholderTextColor={colors.mute}
                  />
                  <Button title="Add" onPress={handleAddCategory} />
                </View>
              </View>
            )}
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

        {/* Security Section */}
        <FadeInView delay={350}>
          <Typography variant="captionMono" style={dynamicStyles.sectionTitle}>SECURITY</Typography>
          <Card variant="soft" style={styles.card}>
            <TouchableOpacity onPress={() => toggleSection('security')} style={styles.row}>
              <View>
                <Typography variant="bodyMdStrong">Change Password</Typography>
                <Typography variant="caption" style={{ color: colors.mute }}>Update your account security password</Typography>
              </View>
            </TouchableOpacity>
            
            {expandedSection === 'security' && (
              <View style={[styles.expandedContent, dynamicStyles.expandedContent]}>
                <Typography variant="caption" style={[styles.label, { color: colors.body }]}>Current Password</Typography>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mute}
                />
                <Typography variant="caption" style={[styles.label, { color: colors.body }]}>New Password</Typography>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mute}
                />
                <View style={{ marginTop: spacing.md }}>
                  <Button 
                    title="Update Password" 
                    onPress={() => {
                      if (!oldPassword || !newPassword) {
                        ToastAndroid.show('Please fill in both fields', ToastAndroid.SHORT);
                        return;
                      }
                      setOldPassword('');
                      setNewPassword('');
                      ToastAndroid.show('Password updated successfully (Simulated)', ToastAndroid.SHORT);
                    }} 
                  />
                </View>
              </View>
            )}
          </Card>
        </FadeInView>

        {/* Data & Privacy Section */}
        <FadeInView delay={400}>
          <Typography variant="captionMono" style={dynamicStyles.sectionTitle}>DATA & PRIVACY</Typography>
          <Card variant="soft" style={styles.card}>
            <TouchableOpacity onPress={() => exportToCSV(expenses)} style={styles.row}>
              <View>
                <Typography variant="bodyMdStrong">Export Data to CSV</Typography>
                <Typography variant="caption" style={{ color: colors.mute }}>Download all transactions for Excel</Typography>
              </View>
              <ChevronRight color={colors.mute} size={20} />
            </TouchableOpacity>
          </Card>
        </FadeInView>

        {/* About Section */}
        <FadeInView delay={450}>
          <Typography variant="captionMono" style={dynamicStyles.sectionTitle}>ABOUT</Typography>
          <Card variant="soft" style={styles.card}>
            <TouchableOpacity onPress={() => toggleSection('about')} style={styles.row}>
              <View>
                <Typography variant="bodyMdStrong">About Expense AI</Typography>
                <Typography variant="caption" style={{ color: colors.mute }}>Version and legal info</Typography>
              </View>
            </TouchableOpacity>
            
            {expandedSection === 'about' && (
              <View style={[styles.expandedContent, dynamicStyles.expandedContent]}>
                <Typography variant="bodyMd" style={{ color: colors.text }}>Version 1.0.0</Typography>
                <Typography variant="caption" style={{ color: colors.mute, marginTop: spacing.xs }}>
                  A lightweight intelligent finance tracker designed to auto-scan your SMS bank alerts and group transactions with AI.
                </Typography>
                <Typography variant="captionMono" style={{ color: colors.mute, marginTop: spacing.sm }}>
                  Designed & Developed by Nitish.
                </Typography>
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
  currencyOptions: {
    flexDirection: 'row',
    borderRadius: rounded.md,
    padding: 2,
    width: 150,
  },
  currencyOptionButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: rounded.sm,
  },
  categoryChipsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  categoryManageChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: rounded.full,
    marginRight: spacing.xs,
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

export default Settings;
