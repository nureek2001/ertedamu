import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

const ExploreScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Идеи для занятий</Text>
      <Text style={styles.subtitle}>
        В будущем здесь можно сделать подборки: игры на моторику, речь,
        внимание, эмоциональное развитие и т.д.
      </Text>

      <View style={styles.tagRow}>
        <Text style={styles.tag}>0–1 год</Text>
        <Text style={styles.tag}>2–3 года</Text>
        <Text style={styles.tag}>4–6 лет</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Спокойные игры перед сном</Text>
        <Text style={styles.cardText}>
          Подборка коротких ритуалов, которые помогают ребёнку расслабиться и
          легче засыпать.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Развитие речи в быту</Text>
        <Text style={styles.cardText}>
          Простые фразы и приёмы, которые можно добавлять во время еды,
          прогулок и сборов в садик.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FF',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    marginRight: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#111827',
  },
  cardText: {
    fontSize: 14,
    color: '#4B5563',
  },
});
