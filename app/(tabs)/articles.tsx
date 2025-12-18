// app/(tabs)/activity.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ArticlesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Статьи</Text>
      <Text style={styles.text}>Экран в разработке.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  text: { fontSize: 14, color: '#6B7280' },
});
