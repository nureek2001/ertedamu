import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VIDEOS = [
  {
    id: 'speech',
    title: 'Развитие речи',
    desc: 'Упражнения на звуки и слова (коротко).',
    emoji: '📺',
    gradient: ['#60A5FA', '#3B82F6'] as const,
    url: 'https://www.youtube.com/watch?v=-uxEQliuCrQ&list=RD-uxEQliuCrQ&start_radio=1',
    minutes: 6,
  },
  {
    id: 'baby-contact',
    title: 'Контакт и внимание',
    desc: 'Ритуалы спокойствия для малыша.',
    emoji: '👶',
    gradient: ['#93C5FD', '#60A5FA'] as const,
    url: 'https://www.youtube.com/watch?v=tkkpOEqGFC0&list=RDtkkpOEqGFC0&start_radio=1',
    minutes: 5,
  },
];

export default function VideosIndex() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hTitle}>Видео</Text>
        <Text style={styles.hSub}>Короткие уроки и практики для родителей</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {VIDEOS.map(v => (
          <TouchableOpacity
            key={v.id}
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/videos/player' as any, params: { url: v.url, title: v.title } } as any)}
            style={{ marginTop: 12 }}
          >
            <LinearGradient colors={v.gradient} style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.emoji}>{v.emoji}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{v.minutes} мин</Text>
                </View>
              </View>
              <Text style={styles.title}>{v.title}</Text>
              <Text style={styles.desc}>{v.desc}</Text>
              <View style={styles.cta}><Text style={styles.ctaText}>Смотреть</Text></View>
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
