import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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

type ActiveChildResponse = {
  id: number;
  user: number;
  family: number;
  active_child: Child | null;
  updated_at: string;
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

type ScreeningAvailabilityItem = {
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
  available: boolean;
  reason: string | null;
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

function getAgeText(months: number | null | undefined) {
  if (months === null || months === undefined) return 'Возраст не указан';

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years <= 0) return `${months} мес`;
  if (remainingMonths === 0) return `${years} г`;
  return `${years} г ${remainingMonths} мес`;
}

function getChildEmoji(gender?: 'male' | 'female') {
  return gender === 'female' ? '👧' : '👦';
}

export default function EarlyScreeningScreen() {
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [availability, setAvailability] = useState<ScreeningAvailabilityItem | null>(null);
  const [session, setSession] = useState<ScreeningSession | null>(null);
  const [template, setTemplate] = useState<ScreeningTemplate | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);

        const activeRes = await api.get<ActiveChildResponse>('/api/families/active-child/');
        const child = activeRes.active_child || null;
        setActiveChild(child);

        if (!child) {
          setAvailability(null);
          return;
        }

        const availabilityRes = await api.get<ScreeningAvailabilityItem[]>(
          `/api/screenings/children/${child.id}/availability/`
        );

        const earlyItem =
          availabilityRes.find((item) => item.template?.code === 'early_dev') || null;

        setAvailability(earlyItem);
      } catch (e: any) {
        console.error('EARLY SCREENING LOAD ERROR:', e);
        Alert.alert('Ошибка', e?.detail || 'Не удалось загрузить ранний скрининг');
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  const startEarlyScreening = async () => {
    if (!activeChild) {
      Alert.alert('Внимание', 'Сначала выберите профиль ребенка');
      return;
    }

    if (!availability?.available) {
      Alert.alert(
        'Скрининг недоступен',
        availability?.reason || 'Ранний скрининг сейчас недоступен'
      );
      return;
    }

    try {
      setCreatingSession(true);

      const sessionRes = await api.post<ScreeningSession>('/api/screenings/sessions/', {
        child_id: activeChild.id,
        template_code: 'early_dev',
        target_age_months: activeChild.age_months,
      });

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
      console.error('CREATE EARLY SESSION ERROR:', e);
      Alert.alert('Ошибка', e?.detail || 'Не удалось начать ранний скрининг');
    } finally {
      setCreatingSession(false);
    }
  };

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
    if (!currentQuestion || !session?.id) return;

    try {
      setSavingAnswer(true);

      const nextAnswers = {
        ...answers,
        [currentQuestion.id]: value,
      };
      setAnswers(nextAnswers);

      await api.post(`/api/screenings/sessions/${session.id}/answers/`, {
        answers: [
          {
            question_id: currentQuestion.id,
            answer_value: value,
          },
        ],
      });
    } catch (e: any) {
      console.error('SAVE EARLY ANSWER ERROR:', e);
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
    if (!session?.id || !template) return;

    const unanswered = template.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      Alert.alert('Внимание', 'Ответьте на все вопросы перед завершением');
      return;
    }

    try {
      setSubmitting(true);

      const submitRes = await api.post<ScreeningSession>(
        `/api/screenings/sessions/${session.id}/submit/`,
        {
          confirm: true,
        }
      );

      setSession(submitRes);

      Alert.alert(
        'Ранний скрининг завершен',
        `Статус: ${submitRes.result_level === 'done' ? 'Завершено' : submitRes.result_level}`,
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
      console.error('SUBMIT EARLY SCREENING ERROR:', e);
      Alert.alert('Ошибка', e?.detail || 'Не удалось завершить ранний скрининг');
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

  if (!activeChild) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Профиль ребенка не найден</Text>
          <Text style={styles.emptyText}>
            Сначала добавьте ребенка в настройках профиля
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/parent')}
          >
            <Text style={styles.primaryButtonText}>Открыть профиль</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!session || !template || !currentQuestion) {
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
            <Text style={styles.headerTitle}>Ранний скрининг</Text>
            <View style={{ width: 44 }} />
          </View>

          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.childEmojiWrap}>
                <Text style={styles.childEmoji}>{getChildEmoji(activeChild.gender)}</Text>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>EARLY</Text>
              </View>
            </View>

            <Text style={styles.childName}>{activeChild.first_name}</Text>
            <Text style={styles.childAge}>{getAgeText(activeChild.age_months)}</Text>
          </LinearGradient>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Ранний скрининг развития</Text>
            <Text style={styles.infoText}>
              Этот опрос помогает предварительно оценить базовые навыки развития
              ребенка в соответствии с возрастом.
            </Text>

            {!availability?.available && availability?.reason ? (
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={18} color="#D97706" />
                <Text style={styles.noticeText}>{availability.reason}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!availability?.available || creatingSession) && styles.primaryButtonDisabled,
              ]}
              onPress={startEarlyScreening}
              disabled={!availability?.available || creatingSession}
            >
              {creatingSession ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Начать ранний скрининг</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (session.status === 'completed') {
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
            <Text style={styles.headerTitle}>Ранний скрининг</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.completedCard}>
            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            <Text style={styles.completedTitle}>Скрининг уже завершен</Text>
            <Text style={styles.completedText}>Статус: Завершено</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/(tabs)/my-child')}
            >
              <Text style={styles.primaryButtonText}>Вернуться</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
          <Text style={styles.headerTitle}>Ранний скрининг</Text>
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
              <Text style={styles.badgeText}>EARLY</Text>
            </View>

            <View style={styles.questionCounterBadge}>
              <Text style={styles.questionCounterText}>
                {currentIndex + 1}/{totalQuestions}
              </Text>
            </View>
          </View>

          <Text style={styles.childName}>{session.child.first_name}</Text>
          <Text style={styles.childAge}>
            {getAgeText(session.child.age_months)} • Отвечено: {answeredCount}/{totalQuestions}
          </Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </LinearGradient>

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
            Этот экран использует серверный шаблон раннего скрининга. Ответы
            сохраняются сразу после выбора.
          </Text>
        </View>
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
  childEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childEmoji: {
    fontSize: 26,
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  infoText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
  },
  noticeBox: {
    marginTop: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: '#B45309',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
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
  primaryButton: {
    marginTop: 22,
    backgroundColor: '#6366F1',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});