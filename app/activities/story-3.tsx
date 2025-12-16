import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Story3() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hTitle}>📚 История на 3 предмета</Text>
        <Text style={styles.hSub}>Воображение + речь • 7 минут</Text>
      </View>

      <LinearGradient colors={['#FFF1F2', '#FFFFFF'] as const} style={styles.card}>
        <Text style={styles.stepTitle}>Шаги</Text>
        <Text style={styles.step}>1) Возьмите 3 предмета рядом (или игрушки).</Text>
        <Text style={styles.step}>2) Дайте ребёнку выбрать 1 предмет “главным героем”.</Text>
        <Text style={styles.step}>3) Сочините мини-историю на 4–5 предложений.</Text>
        <Text style={styles.step}>4) В конце спросите: “Как бы ты закончил(а)?”</Text>

        <Text style={styles.stepTitle}>Ваши предметы</Text>

        <View style={styles.row}>
          <TextInput value={a} onChangeText={setA} placeholder="Предмет 1" placeholderTextColor="#94A3B8" style={styles.input} />
          <TextInput value={b} onChangeText={setB} placeholder="Предмет 2" placeholderTextColor="#94A3B8" style={styles.input} />
        </View>
        <TextInput value={c} onChangeText={setC} placeholder="Предмет 3" placeholderTextColor="#94A3B8" style={styles.inputFull} />

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Совет</Text>
          <Text style={styles.tipText}>
            Не исправляйте “ошибки” в речи сразу — лучше мягко повторите правильный вариант.
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
  stepTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 4, marginBottom: 8 },
  step: { fontSize: 13, fontWeight: '700', color: '#334155', lineHeight: 18, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputFull: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  tip: { marginTop: 14, backgroundColor: '#0F172A', borderRadius: 18, padding: 14 },
  tipTitle: { color: '#fff', fontWeight: '900', marginBottom: 6 },
  tipText: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', lineHeight: 18 },
});
