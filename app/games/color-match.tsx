import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ColorItem = { key: 'red' | 'blue' | 'green' | 'yellow'; label: string };

const COLORS: Record<ColorItem['key'], { bg: string; label: string }> = {
  red: { bg: '#EF4444', label: 'Красный' },
  blue: { bg: '#3B82F6', label: 'Синий' },
  green: { bg: '#10B981', label: 'Зелёный' },
  yellow: { bg: '#F59E0B', label: 'Жёлтый' },
};

const KEYS: ColorItem['key'][] = ['red', 'blue', 'green', 'yellow'];

export default function ColorMatchGame() {
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(1);
  const [target, setTarget] = useState<ColorItem['key']>(() => KEYS[Math.floor(Math.random() * KEYS.length)]);

  const options = useMemo(() => {
    // простая мешалка
    const copy = [...KEYS];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [target, step]);

  const pick = (k: ColorItem['key']) => {
    if (k === target) {
      setScore(s => s + 1);
      if (step >= 5) {
        Alert.alert('Отлично!', `Результат: ${score + 1}/5`, [
          { text: 'Ещё раз', onPress: () => { setScore(0); setStep(1); setTarget(KEYS[Math.floor(Math.random() * KEYS.length)]); } },
          { text: 'Назад', onPress: () => router.back() },
        ]);
      } else {
        setStep(s => s + 1);
        setTarget(KEYS[Math.floor(Math.random() * KEYS.length)]);
      }
      return;
    }

    Alert.alert('Почти!', 'Попробуй ещё раз 🙂');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🎨 Найди цвет</Text>
        <Text style={styles.sub}>Шаг {step}/5 • Очки: {score}</Text>
      </View>

      <LinearGradient colors={['#ECFDF5', '#FFFFFF'] as const} style={styles.panel}>
        <Text style={styles.task}>Нажми: <Text style={styles.taskBold}>{COLORS[target].label}</Text></Text>

        <View style={styles.grid}>
          {options.map(k => (
            <TouchableOpacity key={k} activeOpacity={0.9} onPress={() => pick(k)} style={styles.tileWrap}>
              <View style={[styles.tile, { backgroundColor: COLORS[k].bg }]} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>Подсказка: можно проговаривать цвета вслух — это развивает речь.</Text>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  sub: { marginTop: 4, fontSize: 12, fontWeight: '800', color: '#64748B' },
  panel: { margin: 20, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  task: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  taskBold: { color: '#10B981', fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  tileWrap: { width: '47%' },
  tile: { height: 90, borderRadius: 18 },
  hint: { marginTop: 14, fontSize: 12, fontWeight: '700', color: '#475569', lineHeight: 16 },
});
