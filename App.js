// App.js
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 👇 딱 한 번씩만 import
import MainScreen from './src/screens/MainScreen';
import StudyScreen from './src/screens/StudyScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TTSScreen from './src/screens/TTSScreen'; // 있다면 유지, 없다면 이 줄 제거

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Main">
        <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Study" component={StudyScreen} options={{ title: '공부하기' }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: '복습하기' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '설정' }} />
        {/* TTSScreen 파일이 없으면 아래 줄을 지우세요 */}
        <Stack.Screen name="TTS" component={TTSScreen} options={{ title: 'TTS' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
