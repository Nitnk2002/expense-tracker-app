/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "./src/app/pages/Login";
import SignUp from "./src/app/pages/SignUp";
import Home from "./src/app/pages/Home";

const Stack = createNativeStackNavigator();

function App() { 
  return (

    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
