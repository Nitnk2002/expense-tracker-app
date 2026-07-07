import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { Card } from '../components/Card';
import { FadeInView } from '../components/FadeInView';
import { Typography } from '../components/Typography';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { apiClient } from '../api/apiClient';
import { spacing } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

const SignUp = ({ navigation }: any) => {
  const { login: contextLogin } = useContext(AuthContext);
  // Removed showDialog
  const { colors } = useTheme();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [loading, setLoading] = useState(false);

  const gotoLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignUpSubmit = async () => {
    if (!userName || !password) return;
    setLoading(true);
    try {
      const response = await apiClient('/auth/v1/signup', {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          username: userName,
          user_name: userName,
          email: email,
          password: password,
          phone_number: parseInt(phoneNo, 10) || 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.accessToken || data.access_token;
        const refToken = data.token || data.refresh_token;

        if (token && refToken) {
          const actualUserId = data.user_id || data.id || userName;
          // Save the profile info locally since the backend doesn't store these fields yet
          try {
            const fullName = `${firstName} ${lastName}`.trim();
            await AsyncStorage.setItem(`@profile_${actualUserId}`, JSON.stringify({ 
              name: fullName || userName, 
              email: email, 
              phone: phoneNo 
            }));
          } catch (e) {
            console.warn('Failed to save local profile data', e);
          }

          await contextLogin(token, refToken, actualUserId);
          // RootNavigator will automatically unmount AuthStack
        }
      } else {
        const errText = await response.text();
        console.warn('Signup failed with status:', response.status, errText);
        ToastAndroid.show(errText || 'Something went wrong. Please try again.', ToastAndroid.LONG);
      }
    } catch (error: any) {
      console.error('Error during SignUp: ', error);
      ToastAndroid.show(error.message || 'Failed to connect to the server.', ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = {
    screen: {
      flex: 1,
      backgroundColor: colors.canvasSoft2,
    },
  };

  return (
    <SafeAreaView style={dynamicStyles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <FadeInView delay={0}>
            <Logo size={48} />
          </FadeInView>
          <Card variant="auth" style={styles.authCard}>
            <FadeInView delay={100} style={styles.header}>
              <Typography variant="displaySm" style={styles.title}>
                Sign Up
              </Typography>
              <Typography variant="bodySm" style={[styles.subtitle, { color: colors.mute }]}>
                Create your account to get started.
              </Typography>
            </FadeInView>

            <FadeInView delay={200} style={styles.row}>
              <View style={[styles.formGroup, styles.flexHalf]}>
                <Typography variant="captionMono" style={styles.label}>FIRST NAME</Typography>
                <Input placeholder="John" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={{ width: spacing.md }} />
              <View style={[styles.formGroup, styles.flexHalf]}>
                <Typography variant="captionMono" style={styles.label}>LAST NAME</Typography>
                <Input placeholder="Doe" value={lastName} onChangeText={setLastName} />
              </View>
            </FadeInView>

            <FadeInView delay={300} style={styles.formGroup}>
              <Typography variant="captionMono" style={styles.label}>USERNAME</Typography>
              <Input placeholder="Username" value={userName} onChangeText={setUserName} autoCapitalize="none" />
            </FadeInView>

            <FadeInView delay={400} style={styles.formGroup}>
              <Typography variant="captionMono" style={styles.label}>EMAIL</Typography>
              <Input placeholder="john@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </FadeInView>

            <FadeInView delay={500} style={styles.formGroup}>
              <Typography variant="captionMono" style={styles.label}>PASSWORD</Typography>
              <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
            </FadeInView>

            <FadeInView delay={600} style={styles.formGroup}>
              <Typography variant="captionMono" style={styles.label}>PHONE NUMBER</Typography>
              <Input placeholder="+1 555 555 5555" value={phoneNo} onChangeText={setPhoneNo} keyboardType="phone-pad" />
            </FadeInView>

            <FadeInView delay={700} style={styles.actions}>
              <Button
                title={loading ? 'Signing up...' : 'Sign Up'}
                onPress={handleSignUpSubmit}
                disabled={loading}
              />
              <Button
                title="Already have an account?"
                variant="secondary"
                onPress={gotoLogin}
                disabled={loading}
                style={styles.secondaryButton}
              />
            </FadeInView>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    flex: 1,
  },
  authCard: {
    width: '100%',
    maxWidth: 400,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    // Dynamic color
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  flexHalf: {
    flex: 1,
  },
  label: {
    marginBottom: spacing.xxs,
    marginLeft: spacing.xxs,
  },
  actions: {
    marginTop: spacing.lg,
  },
  secondaryButton: {
    marginTop: spacing.md,
  },
});

export default SignUp;
