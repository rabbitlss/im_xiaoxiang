import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import { useApp } from '@/store';

// 导入屏幕组件
import LoginScreen from '@/screens/auth/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import ChatScreen from '@/screens/chat/ChatScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { state } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {state.isAuthenticated ? (
          // 已登录用户的导航栈
          <>
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params.userName,
                headerBackTitleVisible: false,
              })}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                title: '个人资料',
                headerBackTitleVisible: false,
              }}
            />
          </>
        ) : (
          // 未登录用户的导航栈
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}