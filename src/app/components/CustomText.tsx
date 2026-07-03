import React, { ReactNode } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface CustomTextProps {
  style?: TextStyle | TextStyle[];
  children?: ReactNode;
  [key: string]: any;
}

const CustomText = ({ style, children, ...props }: CustomTextProps) => {
  return (
    <Text style={[styles.text, style]} {...props}>
      {children}
    </Text>
  );
};

export default CustomText;

const styles = StyleSheet.create({
  text: {
    color: 'black',
    fontFamily: 'Helvetica',
  },
});
