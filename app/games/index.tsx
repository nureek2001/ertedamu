import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GAMES = [
  {
    id: 'color-match',
    title: 'Найди цвет',
    desc: 'Выбери нужный цвет по подсказке.',
    emoji: '🎨',
    gradient: ['#34D399', '#10B981'] as const,
    route: '/games/color-match',
    tag: 'Внимание • 2 мин',
  },
  {
    id: 'shapes',
    title: 'Фигуры',
    desc: 'Угадай фигуру по описанию.',
    emoji: '🔺',
    gradient: ['#A78BFA', '#8B5CF6'] as const,
    route: '/games/shapes',
    tag: 'Логика • 3 мин',
  },
];

export default function GamesIndex() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hTitle}>Игры</Text>
        <Text style={styles.hSub}>Короткие мини-игры для развития навыков</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {GAMES.map(g => (
          <TouchableOpacity
            key={g.id}
            activeOpacity={0.9}
            onPress={() => router.push(g.route as any)}
            style={styles.cardWrap}
          >
            <LinearGradient colors={g.gradient} style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.emoji}>{g.emoji}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{g.tag}</Text>
                </View>
              </View>
              <Text style={styles.title}>{g.title}</Text>
              <Text style={styles.desc}>{g.desc}</Text>

              <View style={styles.cta}>
                <Text style={styles.ctaText}>Играть</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={{ height: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  hTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  hSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#64748B' },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  cardWrap: { marginTop: 12 },
  card: { borderRadius: 20, padding: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emoji: { fontSize: 26 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  title: { marginTop: 10, fontSize: 18, fontWeight: '900', color: '#fff' },
  desc: { marginTop: 6, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.95)', lineHeight: 16 },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: { color: '#0F172A', fontWeight: '900', fontSize: 12 },
});
