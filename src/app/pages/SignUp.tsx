import React, { ReactNode } from 'react';
import { Text, StyleSheet, TextStyle, View, TextInput } from 'react-native';
import CustomBox from '../components/CustomBox';
import CustomText from '../components/CustomText';
import { Button } from '@gluestack-ui/themed';
import AsyncStorage from '@react-native-async-storage/async-storage';


const SignUp = ({navigation}) => {
    const [userName, setUserName] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setlastName] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [phoneNo, setPhoneNo] = React.useState("");

    const gotoLoginWithoutValidation = () => {
      navigation.navigate('Login', {name: 'Login'});
    }
    const navigateToLoginScreen = async () => {
      try{
        const response = await fetch('http://10.31.183.185:9898/auth/v1/signup',{
          method: 'POST',
          headers: {
            Accept : 'application/json',
            'Content-Type': 'application/json',
            "X-Requested-With": "XMLHttpRequest"
          },
          body: JSON.stringify({
            firstName: firstName,
            lastName: lastName,
            userName: userName,
            email: email,
            password: password,
            phoneNo: phoneNo
          })
        });
         const data = await response.json();
         await AsyncStorage.setItem('accessToken', data.accessToken);
          await AsyncStorage.setItem('refreshToken', data.refreshToken);
          navigation.navigate('Home', {name: 'Home'});
      }catch(error){
        console.log("Error during SignUp: ", error);
      }
    }
  return (
      <View style={styles.signupContainer}>
        <CustomBox style={signupBox}>
          <CustomText style={styles.heading}>Sign Up</CustomText>

          <TextInput 
          placeholder="Enter First Name" 
          value={firstName}
          onChangeText={text => setFirstName(text)}
          style={styles.textInput}
          placeholderTextColor="#888" />

          <TextInput 
          placeholder="Enter Last Name" 
          value={lastName}
          onChangeText={text => setlastName(text)}
          style={styles.textInput}
          placeholderTextColor="#888" />

          <TextInput 
          placeholder="Enter User Name" 
          value={userName}
          onChangeText={text => setUserName(text)}
          style={styles.textInput}
          placeholderTextColor="#888" />

          <TextInput 
          placeholder="Enter Email" 
          value={email}
          onChangeText={text => setEmail(text)}
          style={styles.textInput}
          placeholderTextColor="#888" />
          <TextInput 
          placeholder="Enter Password" 
          value={password}
          secureTextEntry
          onChangeText={text => setPassword(text)}
          style={styles.textInput}
          placeholderTextColor="#888" />

          <TextInput 
          placeholder="Enter Phone No." 
          value={phoneNo}
          onChangeText={text => setPhoneNo(text)}
          style={styles.textInput}
          placeholderTextColor="#888" />

        </CustomBox>
        <Button onPress={() => {navigateToLoginScreen()}} style= {styles.button}>
          <CustomBox style={buttonBox}>
            <CustomText style={{textAlign: "center"}}>SignUp</CustomText>
          </CustomBox>
        </Button>
        <Button onPress={() => {gotoLoginWithoutValidation()}} style= {styles.button}>
          <CustomBox style={buttonBox}>
            <CustomText style={{textAlign: "center"}}>Login</CustomText>
          </CustomBox>
        </Button>
      </View>

  );
};

export default SignUp;
const signupBox = {
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
  signupContainer:{
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

