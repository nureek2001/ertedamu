import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MCHAT_QUESTIONS = [
  { id: 1, text: "Если вы покажете на что-то в другом конце комнаты, посмотрит ли ваш ребенок на это?" },
  { id: 2, text: "Возникали ли у вас когда-нибудь мысли о том, что ваш ребенок глухой?" },
  { id: 3, text: "Играет ли ваш ребенок в имитационные игры? (Например, «кормит» куклу)?" },
  { id: 4, text: "Любит ли ваш ребенок карабкаться по предметам? (Например, по мебели)?" },
  { id: 5, text: "Делает ли ваш ребенок необычные движения пальцами перед своими глазами?" },
  { id: 6, text: "Указывает ли ваш ребенок пальцем, чтобы попросить что-то?" },
  { id: 7, text: "Указывает ли ваш ребенок пальцем, чтобы показать вам что-то интересное?" },
  { id: 8, text: "Интересуется ли ваш ребенок другими детьми?" },
  { id: 9, text: "Приносит ли ваш ребенок вам предметы, чтобы показать их?" },
  { id: 10, text: "Откликается ли ребенок на свое имя, когда вы его зовете?" },
  { id: 11, text: "Когда вы улыбаетесь ребенку, улыбается ли он в ответ?" },
  { id: 12, text: "Расстраивают ли ребенка обычные бытовые шумы? (Например, пылесос)?" },
  { id: 13, text: "Умеет ли ваш ребенок ходить?" },
  { id: 14, text: "Смотрит ли ваш ребенок вам в глаза?" },
  { id: 15, text: "Пытается ли ваш ребенок копировать ваши действия? (Например, машет пока)?" },
  { id: 16, text: "Если вы повернете голову, будет ли ребенок смотреть в ту же сторону?" },
  { id: 17, text: "Пытается ли ваш ребенок привлечь ваше внимание к себе?" },
  { id: 18, text: "Понимает ли ваш ребенок ваши указания без жестов?" },
  { id: 19, text: "Если происходит что-то необычное, смотрит ли ребенок на вашу реакцию?" },
  { id: 20, text: "Любит ли ваш ребенок активные игры (подбрасывания, качания)?" },
];

export default function ScreeningScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams();
  const [answers, setAnswers] = useState<Record<number, boolean>>({});

  const progress = (Object.keys(answers).length / MCHAT_QUESTIONS.length) * 100;

  const calculateScore = async () => {
    if (Object.keys(answers).length < 20) {
      Alert.alert("Тест не завершен", "Пожалуйста, ответьте на все вопросы для получения точного результата.");
      return;
    }

    let score = 0;
    MCHAT_QUESTIONS.forEach((q) => {
      const ans = answers[q.id];
      if ([2, 5, 12].includes(q.id)) {
        if (ans === true) score++;
      } else {
        if (ans === false) score++;
      }
    });

    const status = score <= 2 ? 'low' : score <= 7 ? 'medium' : 'high';
    const resultData = { score, status, date: new Date().toISOString() };

    await AsyncStorage.setItem(`mchat_result_${childId || 'main'}`, JSON.stringify(resultData));
    await AsyncStorage.setItem(`last_screening_date_${childId}`, new Date().toISOString());
    Alert.alert(
      "Результат готов", 
      `Баллы риска: ${score}. Результат сохранен в профиле ребенка.`,
      [{ text: "К профилю", onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.screen}>
      {/* Градиентная шапка */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Скрининг M-CHAT-R</Text>
              <Text style={styles.headerSubtitle}>{Object.keys(answers).length} из 20 ответов</Text>
            </View>
            <View style={{ width: 28 }} /> 
          </View>
          <View style={styles.progressBarWrapper}>
             <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
             </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introCard}>
           <View style={styles.introInfo}>
             <Ionicons name="information-circle" size={22} color="#6366F1" />
             <Text style={styles.introText}>
               Отвечайте, как ваш ребенок ведет себя обычно. Если поведение было замечено редко — отвечайте "Нет".
             </Text>
           </View>
        </View>

        {MCHAT_QUESTIONS.map((q, index) => {
          const isAnswered = answers[q.id] !== undefined;
          return (
            <View key={q.id} style={[styles.card, isAnswered && styles.cardAnswered]}>
              <View style={styles.qHeader}>
                <LinearGradient
                  colors={isAnswered ? ['#6366F1', '#8B5CF6'] : ['#F1F5F9', '#E2E8F0']}
                  style={styles.qNumberContainer}
                >
                  <Text style={[styles.qNumber, isAnswered && {color: '#FFF'}]}>{index + 1}</Text>
                </LinearGradient>
                <Text style={styles.qText}>{q.text}</Text>
              </View>
              
              <View style={styles.btnRow}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setAnswers({ ...answers, [q.id]: true })}
                  style={styles.flex1}
                >
                  <LinearGradient
                    colors={answers[q.id] === true ? ['#10B981', '#059669'] : ['#F8FAFC', '#F1F5F9']}
                    style={[styles.btn, answers[q.id] === true && styles.btnActiveShadow]}
                  >
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color={answers[q.id] === true ? '#FFF' : '#94A3B8'} 
                    />
                    <Text style={[styles.btnText, answers[q.id] === true && styles.btnTextActive]}>Да</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setAnswers({ ...answers, [q.id]: false })}
                  style={styles.flex1}
                >
                  <LinearGradient
                    colors={answers[q.id] === false ? ['#EF4444', '#DC2626'] : ['#F8FAFC', '#F1F5F9']}
                    style={[styles.btn, answers[q.id] === false && styles.btnActiveShadow]}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={20} 
                      color={answers[q.id] === false ? '#FFF' : '#94A3B8'} 
                    />
                    <Text style={[styles.btnText, answers[q.id] === false && styles.btnTextActive]}>Нет</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={calculateScore}
          disabled={progress < 100}
        >
          <LinearGradient
            colors={progress < 100 ? ['#94A3B8', '#64748B'] : ['#6366F1', '#8B5CF6']}
            style={styles.submitBtn}
          >
            <Text style={styles.submitText}>Завершить скрининг</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  flex1: { flex: 1 },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeBtn: { padding: 4 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
  progressBarWrapper: { paddingHorizontal: 40, marginTop: 5 },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  introCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  introInfo: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  introText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardAnswered: {
    borderColor: '#E0E7FF',
  },
  qHeader: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  qNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  qText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 24,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnActiveShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0,
  },
  btnText: {
    fontWeight: '700',
    color: '#64748B',
    fontSize: 15,
  },
  btnTextActive: {
    color: '#FFF',
  },
  submitBtn: {
    padding: 20,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  submitText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 18,
  },
});