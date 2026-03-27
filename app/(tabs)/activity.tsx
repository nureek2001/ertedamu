// app/(tabs)/activity.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader, { ChildChip } from '../../components/common/AppHeader';
import AskAvaFab from '../../components/common/AskAvaFab';

import { api, logoutRequest } from '@/lib/api';

import {
  ACTIVITY_LIBRARY,
  ActivityCategory,
  AgeGroup,
  CATEGORY_META,
} from '../activities/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ITEM_ESTIMATED_WIDTH = 85;

const generateTimeline = () => {
  const timeline: Array<{ value: number; label: string; type: 'month' | 'year' }> = [];
  for (let i = 1; i <= 36; i++) timeline.push({ value: i, label: `${i} мес`, type: 'month' });
  timeline.push({ value: 48, label: '4 года', type: 'year' });
  timeline.push({ value: 60, label: '5 лет', type: 'year' });
  timeline.push({ value: 72, label: '6 лет', type: 'year' });
  return timeline;
};
const TIMELINE_DATA = generateTimeline();

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const normalizeTimelineMonth = (months: number) => {
  if (months <= 1) return 1;
  if (months <= 36) return months;
  if (months <= 48) return 48;
  if (months <= 60) return 60;
  return 72;
};
type Child = {
  id: number;
  family: number;
  first_name: string;
  birth_date: string;
  gender: 'male' | 'female';
  is_primary: boolean;
  created_at: string;
  age_months: number;
  latest_measurement?: {
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

type ActivityHistoryItem = {
  id: number;
  activity: {
    id: number;
    title: string;
    slug: string;
    description: string;
    instructions: string | null;
    category: {
      id: number;
      name: string;
      slug: string;
    } | null;
    min_age_months: number;
    max_age_months: number;
    duration_minutes: number;
    is_active: boolean;
  };
  difficulty: 'easy' | 'ok' | 'hard' | null;
  note: string | null;
  completed_at: string;
};

const formatAgeLabel = (months: number): string => {
  if (months <= 0) return 'Малыш';
  if (months < 12) return `${months} мес.`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} лет`;
  return `${years} г. ${remainingMonths} мес.`;
};

const getAgeGroupFromMonths = (months: number): AgeGroup => {
  if (months < 12) return 'baby';
  if (months < 36) return 'toddler';
  if (months < 84) return 'preschool';
  return 'school' as any;
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'легко': return '#10B981';
    case 'средне': return '#F59E0B';
    case 'сложно': return '#EF4444';
    default: return '#6B7280';
  }
};

const categoryOrder: ActivityCategory[] = [
  'fine_motor', 'cognitive', 'speech', 'self_care', 'social_emotional', 'gross_motor',
];

const ActivityScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [activeChildId, setActiveChildId] = useState<string>('main');
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('fine_motor');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const timelineScrollRef = useRef<ScrollView>(null);

  const fetchProgress = useCallback(async (childId: string) => {
    try {
      const history = await api.get<ActivityHistoryItem[]>(`/api/activities/children/${childId}/history/`);
      const ids = new Set((history || []).map((p) => String(p.activity.id)));
      setCompletedIds(ids);
    } catch (e) {
      console.warn('ACTIVITY PROGRESS ERROR:', e);
      setCompletedIds(new Set());
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [childrenRes, activeRes] = await Promise.all([
        api.get<Child[]>('/api/families/children/'),
        api.get<ActiveChildResponse>('/api/families/active-child/'),
      ]);

      if (!childrenRes || childrenRes.length === 0) {
        setChildrenList([]);
        setCompletedIds(new Set());
        setSelectedMonth(1);
        setActiveChildId('main');
        setActiveChildIndex(0);
        return;
      }

      const list: ChildChip[] = childrenRes.map((c) => ({
        id: String(c.id),
        name: c.first_name || 'Ребёнок',
        tag: formatAgeLabel(c.age_months || 1),
        ageGroup: getAgeGroupFromMonths(c.age_months || 1),
        color: c.is_primary ? '#3B82F6' : '#10B981',
        // @ts-ignore
        ageMonths: c.age_months || 1,
      }));

      setChildrenList(list);

      const backendActiveId = activeRes?.active_child?.id ? String(activeRes.active_child.id) : null;

      let idx = 0;
      if (backendActiveId) {
        const byId = list.findIndex((c) => c.id === backendActiveId);
        idx = byId !== -1 ? byId : 0;
      }

      idx = clamp(idx, 0, list.length - 1);

      const resolvedChild = list[idx] ?? list[0];
      const resolvedId = resolvedChild?.id ?? 'main';

      setActiveChildIndex(idx);
      setActiveChildId(resolvedId);

      // @ts-ignore
      const ageMonths = resolvedChild?.ageMonths || 1;
      setSelectedMonth(normalizeTimelineMonth(ageMonths));

      await fetchProgress(resolvedId);
    } catch (e: any) {
      console.warn('ACTIVITY LOAD ERROR:', e);

      if (e?.detail === 'Учетные данные не были предоставлены.') {
        router.replace('/login');
        return;
      }

      if (e?.detail === 'Семья не найдена.') {
        setChildrenList([]);
        setCompletedIds(new Set());
        setSelectedMonth(1);
        setActiveChildId('main');
        setActiveChildIndex(0);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [fetchProgress]);

  useEffect(() => {
      loadData();
    }, [loadData]);

    useFocusEffect(
  useCallback(() => {
    if (!activeChildId) return;
    fetchProgress(activeChildId);
  }, [activeChildId, fetchProgress])
);

useEffect(() => {
  const child = childrenList[activeChildIndex];
  if (!child?.id) return;

  fetchProgress(child.id);
}, [activeChildIndex, childrenList, fetchProgress]);

  const handleChildChange = async (index: number) => {
    const child = childrenList[index];
    if (!child?.id) return;

    try {
      setActiveChildIndex(index);
      setActiveChildId(child.id);

      //@ts-ignore
      setSelectedMonth(normalizeTimelineMonth(child.ageMonths || 1))

      await api.post('/api/families/active-child/set/', {
        child_id: Number(child.id),
      });

      await fetchProgress(child.id);
    } catch (e) {
      console.warn('ACTIVE CHILD SWITCH ERROR:', e);
    }
  };

  const activitiesForMonth = useMemo(() => {
    return ACTIVITY_LIBRARY.filter((item) => {
      if (item.category !== activeCategory) return false;
      return selectedMonth >= item.minMonths && selectedMonth <= item.maxMonths;
    });
  }, [activeCategory, selectedMonth]);

  const activeChild = childrenList[activeChildIndex];
  // @ts-ignore
  const currentRealAge = activeChild?.ageMonths || 1;

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      router.replace('/login');
    }
  };

  useEffect(() => {
    if (selectedMonth > 0 && timelineScrollRef.current) {
      const index = TIMELINE_DATA.findIndex((item) => item.value === selectedMonth);
      if (index !== -1) {
        const x =
          index * ITEM_ESTIMATED_WIDTH -
          SCREEN_WIDTH / 2 +
          ITEM_ESTIMATED_WIDTH / 2;

        setTimeout(() => {
          timelineScrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
        }, 300);
      }
    }
  }, [selectedMonth]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const currentMeta = CATEGORY_META[activeCategory];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        childrenList={childrenList}
        activeChildIndex={activeChildIndex}
        onChangeChild={handleChildChange}
        onLogout={handleLogout}
      />

      <View style={styles.body}>
        <View style={styles.timelineContainer}>
          <ScrollView
            ref={timelineScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineContent}
          >
            {TIMELINE_DATA.map((item) => {
              const isSelected = item.value === selectedMonth;

              let isCurrentAge = false;
              if (item.type === 'month') isCurrentAge = item.value === currentRealAge;
              else isCurrentAge = currentRealAge >= item.value && currentRealAge < item.value + 12;

              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => setSelectedMonth(item.value)}
                  style={[
                    styles.timelineItem,
                    isSelected && styles.timelineItemSelected,
                    isCurrentAge && !isSelected && styles.timelineItemCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.timelineText,
                      isSelected && styles.timelineTextSelected,
                      isCurrentAge && !isSelected && { color: '#6366F1', fontWeight: '700' },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isCurrentAge && <View style={styles.currentAgeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
            >
              {categoryOrder.map((key) => {
                const meta = CATEGORY_META[key];
                const selected = key === activeCategory;

                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.9}
                    onPress={() => setActiveCategory(key)}
                    style={[styles.categoryCardWrapper, selected && styles.categoryCardWrapperSelected]}
                  >
                    <LinearGradient
                      colors={selected ? meta.gradient : ['#FFFFFF', '#F8FAFC']}
                      style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                    >
                      <View style={styles.categoryIconCircle}>
                        <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
                      </View>
                      <Text style={[styles.categoryTitle, selected && { color: '#fff' }]}>
                        {meta.label}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.activitiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{currentMeta.label}</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedMonth < 48 ? `${selectedMonth} месяц` : `${selectedMonth / 12} лет`}
              </Text>
            </View>

            {activitiesForMonth.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Нет активностей</Text>
                <Text style={styles.emptyDescription}>
                  Попробуйте выбрать другой месяц или категорию.
                </Text>
              </View>
            ) : (
              activitiesForMonth.map((activity) => {
                const isCompleted = completedIds.has(String(activity.id));

                return (
                  <TouchableOpacity
                    key={activity.id}
                    activeOpacity={0.95}
                    onPress={() =>
                      router.push({ pathname: '/activities/[id]' as any, params: { id: activity.id } })
                    }
                    style={[
                      styles.activityCard,
                      isCompleted && { borderColor: '#86EFAC', borderWidth: 1 },
                    ]}
                  >
                    <View style={styles.activityContent}>
                      <View style={styles.rowBetween}>
                        <View
                          style={[
                            styles.difficultyTag,
                            { backgroundColor: getDifficultyColor(activity.difficulty) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.difficultyText,
                              { color: getDifficultyColor(activity.difficulty) },
                            ]}
                          >
                            {activity.difficulty}
                          </Text>
                        </View>
                        <Text style={styles.durationText}>{activity.minutes} мин</Text>
                      </View>

                      <Text style={styles.cardTitle}>{activity.title}</Text>
                      <Text style={styles.cardSubtitle}>{activity.subtitle}</Text>

                      <View style={styles.cardFooter}>
                        <LinearGradient
                          colors={isCompleted ? ['#22C55E', '#16A34A'] : currentMeta.gradient}
                          style={styles.playIconGradient}
                        >
                          <Ionicons name={isCompleted ? 'checkmark' : 'play'} size={14} color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.startText, isCompleted && { color: '#16A34A' }]}>
                          {isCompleted ? 'Выполнено' : 'Начать'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        <AskAvaFab onPress={() => router.push('/chat' as any)} />
      </View>
    </SafeAreaView>
  );
};

export default ActivityScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  timelineContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timelineContent: { paddingHorizontal: 16, alignItems: 'center' },
  timelineItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    minWidth: 60,
    alignItems: 'center',
  },
  timelineItemSelected: { backgroundColor: '#334155' },
  timelineItemCurrent: { borderWidth: 1, borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  timelineText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  timelineTextSelected: { color: '#FFFFFF' },
  currentAgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    borderWidth: 1,
    borderColor: '#FFF',
  },

  categoriesSection: { marginTop: 16, marginBottom: 20 },
  categoriesScrollContent: { paddingLeft: 24, paddingRight: 24 },
  categoryCardWrapper: { marginRight: 10, width: 90 },
  categoryCardWrapperSelected: { transform: [{ scale: 1.05 }] },
  categoryCard: {
    height: 90,
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  categoryCardSelected: { borderWidth: 0 },
  categoryIconCircle: { marginBottom: 6 },
  categoryTitle: { fontWeight: '700', fontSize: 11, color: '#334155', textAlign: 'center' },

  activitiesSection: { paddingHorizontal: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sectionSubtitle: { fontSize: 14, fontWeight: '600', color: '#64748B' },

  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityContent: { padding: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  difficultyTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  difficultyText: { fontSize: 11, fontWeight: '700' },
  durationText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playIconGradient: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  startText: { fontWeight: '700', color: '#334155', fontSize: 13 },

  emptyState: { alignItems: 'center', padding: 40, opacity: 0.7 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, color: '#475569' },
  emptyDescription: { textAlign: 'center', marginTop: 8, color: '#94A3B8' },
});