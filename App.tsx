import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/app/context/AuthContext";
import { DialogProvider } from "./src/app/context/DialogContext";
import { RootNavigator } from "./src/app/navigation/RootNavigator";

import { ThemeProvider } from "./src/app/context/ThemeContext";

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <DialogProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </DialogProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
