
import React, { useEffect } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import CustomBox from "../components/CustomBox";
import CustomText from "../components/CustomText";
import SignUp from "./SignUp";
import Home from "./Home";
import { Button, set } from "@gluestack-ui/themed";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Login = ({navigation}) => {

  const [userName, setUserName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [LoggedIn, setLoggedIn] = React.useState("false");

  const gotoSignUp = () => {
    navigation.navigate('Home', {name: 'Home'});
  }

  const isLoggedIn = async () => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const response = await fetch('http://10.31.183.185:9898/ping', 
      {
        method: 'GET',
        headers: {
          Accept : 'application/json',
          'Content-Type': 'application/json',
          Authorization :  `Bearer ${accessToken}`,
          "X-Requested-With": "XMLHttpRequest"
        }
      })
      return response.ok;
  }
  const goToHomeWithLogin = async () => {
    //const refreshToken = await AsyncStorage.getItem('refreshToken');
    const response = await fetch('http://localhost:9898/auth/v1/login', 
      {
        method: 'POST',
        headers: {
          Accept : 'application/json',
          'Content-Type': 'application/json',
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          username: userName,
          password: password
        })
      });
      if(response.ok){
        const data = await response.json();
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        navigation.navigate('Home', {name: 'Home'});
      }
  }
  const refreshToken = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const response = await fetch('http://localhost:9898/auth/v1/refreshToken', 
      {
        method: 'POST',
        headers: {
          Accept : 'application/json',
          'Content-Type': 'application/json',
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          token : refreshToken
        })
      });
      if(response.ok){
        const data = await response.json();
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const accessToken = await AsyncStorage.getItem('accessToken');
        console.log("Token after Refresh ->"+refreshToken+"   ....   "+accessToken);
      }
      return response.ok;
  }
  useEffect(() => {
    const handleLogin = async () => {
      const logged = await isLoggedIn();
      setLoggedIn(logged);
      if(logged){
        navigation.navigate('Home', {name: 'Home'});
      }else{
        const refreshed = await refreshToken();
        setLoggedIn(refreshed);
        if(refreshed){
          navigation.navigate('Home', {name: 'Home'});
        }
      }
    }
    handleLogin();
  }, []);
  return (
    <View style={styles.loginContainer}>
      <CustomBox style={loginBox}>
        <CustomText style={styles.heading}>Login</CustomText>

        <TextInput 
        placeholder="Enter Username" 
        value={userName}
        onChangeText={text => setUserName(text)}
        style={styles.textInput}
        placeholderTextColor="#888" />

        <TextInput 
        placeholder="Enter Password" 
        value={password}
        onChangeText={text => setPassword(text)}
        secureTextEntry
        style={styles.textInput}
        placeholderTextColor="#888" />
      </CustomBox>
      <Button onPress={() => {goToHomeWithLogin()}} style= {styles.button}>
        <CustomBox style={buttonBox}>
          <CustomText style={{textAlign: "center"}}>Submit</CustomText>
        </CustomBox>
      </Button>
      <Button onPress={() => {gotoSignUp()}} style= {styles.button}>
        <CustomBox style={buttonBox}>
          <CustomText style={{textAlign: "center"}}>Goto Sign Up</CustomText>
        </CustomBox>
      </Button>
    </View>
  );
}

export default Login;

const loginBox = {
  mainBox: {
    backgroundColor: 'white',
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  ShadowBox: {
    backgroundColor: 'gray',
    borderRadius: 10, 
  }
}

const styles = StyleSheet.create({
  heading:{
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  button:{
    marginTop: 20,
    width: '30%',
  },
  textInput:{
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    width: '100%',
    color: 'black',
  },
  loginContainer:{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e0e0e0',
  }
});

const buttonBox = {
  mainBox: {
    backgroundColor: 'white',
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 10,
    padding: 20,
  },
  ShadowBox: {
    backgroundColor: 'gray',
    borderRadius: 10, 
  }
  }