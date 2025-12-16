import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SensoryBox() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hTitle}>🧺 Сенсорная коробка</Text>
        <Text style={styles.hSub}>Сенсорика + внимание • 8 минут</Text>
      </View>

      <LinearGradient colors={['#FFFBEB', '#FFFFFF'] as const} style={styles.card}>
        <Text style={styles.blockTitle}>Что нужно</Text>
        <Text style={styles.item}>• Контейнер/коробка</Text>
        <Text style={styles.item}>• Крупа (рис/гречка) или фасоль</Text>
        <Text style={styles.item}>• Ложка/стаканчик</Text>
        <Text style={styles.item}>• 3–5 маленьких предметов (безопасных)</Text>

        <Text style={styles.blockTitle}>Как делать</Text>
        <Text style={styles.item}>1) Спрячьте предметы в крупе.</Text>
        <Text style={styles.item}>2) Ребёнок ищет руками/ложкой.</Text>
        <Text style={styles.item}>3) Каждый найденный предмет называем и описываем (цвет/форма).</Text>

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Безопасность</Text>
          <Text style={styles.tipText}>
            Для малышей используйте крупные предметы и всегда только под присмотром.
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  hTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  hSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#64748B' },
  card: { margin: 20, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  blockTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 6, marginBottom: 8 },
  item: { fontSize: 13, fontWeight: '700', color: '#334155', lineHeight: 18, marginBottom: 6 },
  tip: { marginTop: 14, backgroundColor: '#0F172A', borderRadius: 18, padding: 14 },
  tipTitle: { color: '#fff', fontWeight: '900', marginBottom: 6 },
  tipText: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', lineHeight: 18 },
});
