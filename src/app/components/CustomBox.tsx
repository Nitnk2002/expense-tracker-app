import {Text , View, StyleSheet} from 'react-native';
import React, { ReactNode } from 'react';
import { Box } from '@gluestack-ui/themed';

interface CustomBoxProps {
  style?: {
    mainBox?: object;
    shadowBox?: object;
    [key: string]: any;
  };
  children?: ReactNode;
  [key: string]: any;
}

const CustomBox = ({ style = {}, children, ...props }: CustomBoxProps) => {
    const mainBox = {
      borderColor: style.mainBox?.borderColor || 'black',
      backgroundColor: style.mainBox?.backgroundColor || 'black'
    };
    const shadowBox ={
      backgroundColor: style.shadowBox?.shadowColor || 'gray',
    };
    return (
        <View>
            <Box style={[styles.headingContainer,mainBox, style.mainBox, style.styles]} {...props}>
                {children}
            </Box>
            <Box style={[styles.shadowContainer,shadowBox,style.shadowBox]}></Box>
        </View>
    );
};

export default CustomBox;

const styles = StyleSheet.create({
  headingContainer: {
    padding: 20,
    borderColor: 'black',
    borderWidth: 1,
    position: 'relative',
    backgroundColor: 'black',
  },
  textColor:
  {
    color: 'white',
  },
  shadowContainer:{
    position: 'absolute',
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
    backgroundColor: 'gray',
    zIndex: -1,
  },
});
