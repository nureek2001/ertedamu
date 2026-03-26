import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';

const { width } = Dimensions.get('window');

type Child = {
  id: number;
  family: number;
  first_name: string;
  birth_date: string;
  gender: 'male' | 'female';
  is_primary: boolean;
  created_at: string;
  age_months: number;
  latest_measurement: {
    id: number;
    height: string | null;
    weight: string | null;
    measured_at: string;
    note: string | null;
  } | null;
};

type ScreeningQuestion = {
  id: number;
  order: number;
  text: string;
  answer_type: string;
  is_required: boolean;
};

type ScreeningTemplate = {
  id: number;
  title: string;
  code: string;
  template_type: string;
  description: string | null;
  min_age_months: number;
  max_age_months: number;
  version: string;
  is_active: boolean;
  cooldown_days: number;
  questions: ScreeningQuestion[];
};

type ScreeningSession = {
  id: number;
  child: Child;
  template: {
    id: number;
    title: string;
    code: string;
    template_type: string;
    description: string | null;
    min_age_months: number;
    max_age_months: number;
    version: string;
    is_active: boolean;
    cooldown_days: number;
    questions_count?: number;
  };
  status: string;
  result_level: 'low' | 'medium' | 'high' | 'done' | 'unknown';
  score: number;
  target_age_months: number | null;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  answers?: Array<{
    id: number;
    question: ScreeningQuestion;
    question_id?: number;
    answer_value: string;
  }>;
};

type AnswerMap = Record<number, 'yes' | 'no'>;

function getRiskLabel(level?: string | null) {
  switch (level) {
    case 'low':
      return 'Низкий риск';
    case 'medium':
      return 'Средний риск';
    case 'high':
      return 'Высокий риск';
    case 'done':
      return 'Завершено';
    default:
      return 'Нет данных';
  }
}

function getRiskColor(level?: string | null) {
  switch (level) {
    case 'low':
      return '#10B981';
    case 'medium':
      return '#F59E0B';
    case 'high':
      return '#EF4444';
    default:
      return '#64748B';
  }
}

export default function ScreeningScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string;
    childId?: string;
  }>();

  const sessionId = params.sessionId ? Number(params.sessionId) : null;

  const [session, setSession] = useState<ScreeningSession | null>(null);
  const [template, setTemplate] = useState<ScreeningTemplate | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!sessionId) {
        Alert.alert('Ошибка', 'Сессия скрининга не найдена');
        router.back();
        return;
      }

      try {
        setLoading(true);

        const sessionRes = await api.get<ScreeningSession>(
          `/api/screenings/sessions/${sessionId}/`
        );

        setSession(sessionRes);

        const templateRes = await api.get<ScreeningTemplate>(
          `/api/screenings/templates/${sessionRes.template.code}/`
        );

        setTemplate(templateRes);

        const initialAnswers: AnswerMap = {};
        if (sessionRes.answers?.length) {
          for (const item of sessionRes.answers) {
            if (item.question?.id && (item.answer_value === 'yes' || item.answer_value === 'no')) {
              initialAnswers[item.question.id] = item.answer_value;
            }
          }
        }

        setAnswers(initialAnswers);

        if (templateRes.questions?.length) {
          const firstUnansweredIndex = templateRes.questions.findIndex(
            (q) => !initialAnswers[q.id]
          );
          setCurrentIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
        }
      } catch (e: any) {
        console.error('SCREENING LOAD ERROR:', e);
        Alert.alert('Ошибка', e?.detail || 'Не удалось загрузить скрининг');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  const questions = template?.questions || [];
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const canGoNext = useMemo(() => {
    if (!currentQuestion) return false;
    return !!answers[currentQuestion.id];
  }, [currentQuestion, answers]);

  const handleSelectAnswer = async (value: 'yes' | 'no') => {
    if (!currentQuestion || !sessionId) return;

    try {
      setSavingAnswer(true);

      const nextAnswers = {
        ...answers,
        [currentQuestion.id]: value,
      };
      setAnswers(nextAnswers);

      await api.post(`/api/screenings/sessions/${sessionId}/answers/`, {
        answers: [
          {
            question_id: currentQuestion.id,
            answer_value: value,
          },
        ],
      });
    } catch (e: any) {
      console.error('SAVE ANSWER ERROR:', e);
      Alert.alert('Ошибка', e?.detail || 'Не удалось сохранить ответ');
    } finally {
      setSavingAnswer(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (!canGoNext) {
      Alert.alert('Внимание', 'Сначала выберите ответ');
      return;
    }

    if (isLastQuestion) {
      handleSubmit();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    if (!sessionId || !template) return;

    const unanswered = template.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      Alert.alert('Внимание', 'Ответьте на все вопросы перед завершением');
      return;
    }

    try {
      setSubmitting(true);

      const submitRes = await api.post<ScreeningSession>(
        `/api/screenings/sessions/${sessionId}/submit/`,
        {
          confirm: true,
        }
      );

      setSession(submitRes);

      Alert.alert(
        'Скрининг завершен',
        `Результат: ${getRiskLabel(submitRes.result_level)}${
          typeof submitRes.score === 'number' ? `\nБаллы: ${submitRes.score}` : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)/my-child');
            },
          },
        ]
      );
    } catch (e: any) {
      console.error('SUBMIT SCREENING ERROR:', e);
      Alert.alert('Ошибка', e?.detail || 'Не удалось завершить скрининг');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!session || !template || !currentQuestion) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Скрининг не найден</Text>
          <Text style={styles.emptyText}>Не удалось загрузить вопросы</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Скрининг</Text>
          <View style={{ width: 44 }} />
        </View>

        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>M-CHAT</Text>
            </View>

            <View style={styles.questionCounterBadge}>
              <Text style={styles.questionCounterText}>
                {currentIndex + 1}/{totalQuestions}
              </Text>
            </View>
          </View>

          <Text style={styles.childName}>{session.child.first_name}</Text>
          <Text style={styles.childAge}>
            {session.child.age_months} мес • Отвечено: {answeredCount}/{totalQuestions}
          </Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </LinearGradient>

        {session.status === 'completed' ? (
          <View style={styles.completedCard}>
            <Ionicons
              name="checkmark-circle"
              size={36}
              color={getRiskColor(session.result_level)}
            />
            <Text style={styles.completedTitle}>Скрининг уже завершен</Text>
            <Text style={styles.completedText}>
              Результат: {getRiskLabel(session.result_level)}
            </Text>
            <Text style={styles.completedScore}>Баллы: {session.score}</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/(tabs)/my-child')}
            >
              <Text style={styles.primaryButtonText}>Вернуться</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.questionCard}>
              <Text style={styles.questionOrder}>Вопрос {currentQuestion.order}</Text>
              <Text style={styles.questionText}>{currentQuestion.text}</Text>

              <View style={styles.answersWrap}>
                <TouchableOpacity
                  style={[
                    styles.answerButton,
                    currentAnswer === 'yes' && styles.answerButtonActive,
                  ]}
                  onPress={() => handleSelectAnswer('yes')}
                  disabled={savingAnswer || submitting}
                >
                  <Text
                    style={[
                      styles.answerButtonText,
                      currentAnswer === 'yes' && styles.answerButtonTextActive,
                    ]}
                  >
                    Да
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.answerButton,
                    currentAnswer === 'no' && styles.answerButtonActive,
                  ]}
                  onPress={() => handleSelectAnswer('no')}
                  disabled={savingAnswer || submitting}
                >
                  <Text
                    style={[
                      styles.answerButtonText,
                      currentAnswer === 'no' && styles.answerButtonTextActive,
                    ]}
                  >
                    Нет
                  </Text>
                </TouchableOpacity>
              </View>

              {savingAnswer ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" color="#6366F1" />
                  <Text style={styles.savingText}>Сохранение ответа...</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.navigationRow}>
              <TouchableOpacity
                style={[
                  styles.navButtonSecondary,
                  currentIndex === 0 && styles.navButtonDisabled,
                ]}
                onPress={handlePrev}
                disabled={currentIndex === 0 || submitting}
              >
                <Text
                  style={[
                    styles.navButtonSecondaryText,
                    currentIndex === 0 && styles.navButtonSecondaryTextDisabled,
                  ]}
                >
                  Назад
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navButtonPrimary,
                  (!canGoNext || submitting) && styles.navButtonPrimaryDisabled,
                ]}
                onPress={handleNext}
                disabled={!canGoNext || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.navButtonPrimaryText}>
                    {isLastQuestion ? 'Завершить' : 'Далее'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.bottomInfoCard}>
              <Text style={styles.bottomInfoTitle}>Важно</Text>
              <Text style={styles.bottomInfoText}>
                Отвечайте честно и выбирайте тот вариант, который чаще всего подходит
                поведению ребенка.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
  },
  header: {
    marginTop: 8,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  questionCounterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  questionCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  childName: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  childAge: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: 18,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 2,
  },
  questionOrder: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6366F1',
    textTransform: 'uppercase',
  },
  questionText: {
    marginTop: 12,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  answersWrap: {
    marginTop: 24,
    gap: 12,
  },
  answerButton: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  answerButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  answerButtonTextActive: {
    color: '#FFFFFF',
  },
  savingRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  navButtonSecondary: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  navButtonSecondaryTextDisabled: {
    color: '#94A3B8',
  },
  navButtonDisabled: {
    opacity: 0.6,
  },
  navButtonPrimary: {
    flex: 1.3,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonPrimaryDisabled: {
    opacity: 0.65,
  },
  navButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomInfoCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    elevation: 2,
  },
  bottomInfoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  bottomInfoText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
  },
  completedTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  completedText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  completedScore: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  primaryButton: {
    marginTop: 22,
    backgroundColor: '#6366F1',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});