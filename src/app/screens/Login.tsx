import React, { useState, useContext } from 'react';
import { View, StyleSheet, Alert, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
// Removed useDialog
import { Card } from '../components/Card';
import { FadeInView } from '../components/FadeInView';
import { Typography } from '../components/Typography';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { apiClient } from '../api/apiClient';
import { spacing } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';

const Login = ({ navigation }: any) => {
  const { login: contextLogin } = useContext(AuthContext);
  // Removed showDialog
  const { colors } = useTheme();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const gotoSignUp = () => {
    navigation.navigate('SignUp');
  };

  const handleLoginSubmit = async () => {
    if (!userName || !password) return;
    setLoading(true);
    try {
      const response = await apiClient('/auth/v1/login', {
        method: 'POST',
        requireAuth: false,
        body: JSON.stringify({
          username: userName,
          password: password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.accessToken || data.access_token;
        const refToken = data.token || data.refresh_token;

        if (token && refToken) {
          const actualUserId = data.user_id || data.id || userName;
          await contextLogin(token, refToken, actualUserId);
          // RootNavigator will automatically unmount AuthStack
        }
      } else {
        const errText = await response.text();
        console.warn('Login failed:', response.status, errText);
        ToastAndroid.show(errText || 'Invalid credentials. Please try again.', ToastAndroid.LONG);
      }
    } catch (err: any) {
      console.error('Login error', err);
      ToastAndroid.show(err.message || 'Failed to connect to the server.', ToastAndroid.LONG);
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
      <View style={styles.container}>
        <FadeInView delay={0}>
          <Logo size={48} />
        </FadeInView>
        
        <Card variant="auth" style={styles.authCard}>
          <FadeInView delay={100} style={styles.header}>
            <Typography variant="displaySm" style={styles.title}>
              Log In
            </Typography>
            <Typography variant="bodySm" style={[styles.subtitle, { color: colors.mute }]}>
              Enter your credentials to continue.
            </Typography>
          </FadeInView>

          <FadeInView delay={200} style={styles.formGroup}>
            <Typography variant="captionMono" style={styles.label}>
              USERNAME
            </Typography>
            <Input
              placeholder="Username"
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="none"
            />
          </FadeInView>

          <FadeInView delay={300} style={styles.formGroup}>
            <Typography variant="captionMono" style={styles.label}>
              PASSWORD
            </Typography>
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </FadeInView>

          <FadeInView delay={400} style={styles.actions}>
            <Button
              title={loading ? 'Logging in...' : 'Log In'}
              onPress={handleLoginSubmit}
              disabled={loading}
            />
            <Button
              title="Create an Account"
              variant="secondary"
              onPress={gotoSignUp}
              disabled={loading}
              style={styles.secondaryButton}
            />
          </FadeInView>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing['2xl'],
  },
  authCard: {
    width: '100%',
    maxWidth: 400,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    // Moved to dynamic color
  },
  formGroup: {
    marginBottom: spacing.md,
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

export default Login;