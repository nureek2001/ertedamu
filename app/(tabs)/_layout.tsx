// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0284C7',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 11,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarStyle: {
          // делаем таббар чуть выше, чтобы не залезать на home-indicator
          height: Platform.OS === 'ios' ? 80 : 64,
          paddingBottom: Platform.OS === 'ios' ? 18 : 8,
          paddingTop: 6,
          borderTopWidth: 0.5,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      {/* Главная — твой HomeScreen (index.tsx) */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Главная',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Активность */}
      <Tabs.Screen
        name="activity"
        options={{
          tabBarLabel: 'Активность',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Этапы */}
      <Tabs.Screen
        name="milestones"
        options={{
          tabBarLabel: 'Этапы',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Консультация */}
      <Tabs.Screen
        name="consult"
        options={{
          tabBarLabel: 'Консультация',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Статьи */}
      <Tabs.Screen
        name="articles"
        options={{
          tabBarLabel: 'Статьи',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Мой ребёнок */}
      <Tabs.Screen
        name="my-child"
        options={{
          tabBarLabel: 'Мой ребёнок',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
