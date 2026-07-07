import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Logo } from '../components/Logo';
import { useTheme } from '../context/ThemeContext';

interface SplashProps {
  onComplete: () => void;
  isLoading: boolean;
}

export const Splash = ({ onComplete, isLoading }: SplashProps) => {
  const { colors } = useTheme();
  
  // Animation values
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  
  useEffect(() => {
    // Start intro animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  useEffect(() => {
    // When auth is done loading, we animate out and call onComplete
    if (!isLoading) {
      // Hold the splash screen for a tiny bit so the user actually sees the logo
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete();
        });
      }, 1500); // 1.5 second hold so it feels like a real splash screen
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, onComplete, opacity, scale]);

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <Animated.View
        style={{
          opacity,
          transform: [
            { scale },
            { translateY }
          ],
        }}
      >
        <Logo size={96} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});

export default Splash;
