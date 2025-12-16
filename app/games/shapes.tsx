import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ShapeKey = 'circle' | 'square' | 'triangle';

const SHAPES: Record<ShapeKey, { label: string; clue: string; emoji: string }> = {
  circle: { label: 'Круг', clue: 'У него нет углов.', emoji: '⚪️' },
  square: { label: 'Квадрат', clue: 'У него 4 равные стороны.', emoji: '🟥' },
  triangle: { label: 'Треугольник', clue: 'У него 3 угла.', emoji: '🔺' },
};

const KEYS: ShapeKey[] = ['circle', 'square', 'triangle'];

export default function ShapesGame() {
  const [step, setStep] = useState(1);
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState<ShapeKey>(() => KEYS[Math.floor(Math.random() * KEYS.length)]);

  const options = useMemo(() => {
    const arr = [...KEYS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [target, step]);

  const pick = (k: ShapeKey) => {
    if (k === target) {
      setScore(s => s + 1);
      if (step >= 5) {
        Alert.alert('Супер!', `Результат: ${score + 1}/5`, [
          { text: 'Ещё раз', onPress: () => { setScore(0); setStep(1); setTarget(KEYS[Math.floor(Math.random() * KEYS.length)]); } },
          { text: 'Назад', onPress: () => router.back() },
        ]);
      } else {
        setStep(s => s + 1);
        setTarget(KEYS[Math.floor(Math.random() * KEYS.length)]);
      }
      return;
    }
    Alert.alert('Не совсем 🙂', 'Прочитай подсказку ещё раз.');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🔺 Фигуры</Text>
        <Text style={styles.sub}>Шаг {step}/5 • Очки: {score}</Text>
      </View>

      <LinearGradient colors={['#EEF2FF', '#FFFFFF'] as const} style={styles.card}>
        <Text style={styles.question}>Какая это фигура?</Text>
        <Text style={styles.clue}>Подсказка: {SHAPES[target].clue}</Text>

        <View style={styles.row}>
          {options.map(k => (
            <TouchableOpacity key={k} activeOpacity={0.9} style={styles.option} onPress={() => pick(k)}>
              <Text style={styles.optionEmoji}>{SHAPES[k].emoji}</Text>
              <Text style={styles.optionText}>{SHAPES[k].label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>Совет: попроси ребёнка найти такую же фигуру дома (тарелка=круг).</Text>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  sub: { marginTop: 4, fontSize: 12, fontWeight: '800', color: '#64748B' },
  card: { margin: 20, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  question: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  clue: { marginTop: 8, fontSize: 13, fontWeight: '800', color: '#4338CA' },
  row: { marginTop: 16, gap: 10 },
  option: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionEmoji: { fontSize: 18 },
  optionText: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  hint: { marginTop: 14, fontSize: 12, fontWeight: '700', color: '#475569', lineHeight: 16 },
});
