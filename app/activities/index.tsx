import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACTIVITIES = [
  {
    id: 'story-3',
    title: 'История на 3 предмета',
    desc: 'Воображение + речь (быстро).',
    emoji: '📚',
    gradient: ['#F472B6', '#EC4899'] as const,
    route: '/activities/story-3',
    tag: '7 мин • Речь',
  },
  {
    id: 'sensory-box',
    title: 'Сенсорная коробка',
    desc: 'Сенсорика и внимание.',
    emoji: '🧺',
    gradient: ['#FDE68A', '#F59E0B'] as const,
    route: '/activities/sensory-box',
    tag: '8 мин • Сенсорика',
  },
];

export default function ActivitiesIndex() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hTitle}>Упражнения</Text>
        <Text style={styles.hSub}>Пошаговые задания для родителя и ребёнка</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ACTIVITIES.map(a => (
          <TouchableOpacity
            key={a.id}
            activeOpacity={0.9}
            onPress={() => router.push(a.route as any)}
            style={{ marginTop: 12 }}
          >
            <LinearGradient colors={a.gradient} style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.emoji}>{a.emoji}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{a.tag}</Text>
                </View>
              </View>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.desc}>{a.desc}</Text>
              <View style={styles.cta}><Text style={styles.ctaText}>Открыть</Text></View>
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
  card: { borderRadius: 20, padding: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emoji: { fontSize: 26 },
  badge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  title: { marginTop: 10, fontSize: 18, fontWeight: '900', color: '#fff' },
  desc: { marginTop: 6, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.95)', lineHeight: 16 },
  cta: { alignSelf: 'flex-start', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  ctaText: { color: '#0F172A', fontWeight: '900', fontSize: 12 },
});
