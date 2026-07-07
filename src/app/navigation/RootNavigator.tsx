import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ExpenseProvider } from '../context/ExpenseContext';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { Splash } from '../screens/Splash';
import { colors } from '../theme/tokens';

export const RootNavigator = () => {
  const { isLoggedIn, isLoading } = useContext(AuthContext);
  const [isSplashComplete, setIsSplashComplete] = React.useState(false);

  if (!isSplashComplete || isLoading) {
    return (
      <Splash 
        isLoading={isLoading} 
        onComplete={() => setIsSplashComplete(true)} 
      />
    );
  }

  return isLoggedIn ? (
    <ExpenseProvider>
      <AppStack />
    </ExpenseProvider>
  ) : (
    <AuthStack />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.canvasSoft,
  },
});
