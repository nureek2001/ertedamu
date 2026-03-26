// app/(tabs)/milestones.tsx

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
import { AgeGroup } from '../activities/data';
import { MILESTONE_META, MilestoneCategory } from '../milestones/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const generateTimeline = () => {
  const timeline: Array<{ value: number; label: string; type: 'month' | 'year' }> = [];
  for (let i = 1; i <= 36; i++) timeline.push({ value: i, label: `${i} мес`, type: 'month' });
  timeline.push({ value: 48, label: '4 года', type: 'year' });
  timeline.push({ value: 60, label: '5 лет', type: 'year' });
  timeline.push({ value: 72, label: '6 лет', type: 'year' });
  return timeline;
};
const TIMELINE_DATA = generateTimeline();
const ITEM_ESTIMATED_WIDTH = 85;

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

type BackendMilestoneCategory = {
  id: number;
  name: string;
  slug: string;
};

type BackendMilestone = {
  id: number;
  title: string;
  description: string;
  category: BackendMilestoneCategory | null;
  min_age_months: number;
  max_age_months: number;
  is_active: boolean;
};

type BackendMilestoneProgressItem = {
  id: number;
  milestone: BackendMilestone;
  is_completed: boolean;
  confirmed_at: string | null;
  note: string | null;
};

type MilestoneProgressResponse = {
  child_id: number;
  total: number;
  completed: number;
  percent: number;
  items: Array<{
    milestone: BackendMilestone;
    progress: BackendMilestoneProgressItem | null;
  }>;
};

const formatAgeLabel = (months: number): string => {
  if (months <= 0) return 'Малыш';
  if (months < 12) return `${months} мес.`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} лет`;
  return `${years} г. ${remainingMonths} мес.`;
};

const getAgeGroupFromMonths = (m: number): AgeGroup => {
  if (m < 12) return 'baby';
  if (m < 36) return 'toddler';
  if (m < 84) return 'preschool';
  return 'school' as any;
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const MilestonesScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [progressItems, setProgressItems] = useState<
  Array<{
    milestone: {
      id: number;
      title: string;
      description: string;
      category: { id: number; name: string; slug: string } | null;
      min_age_months: number;
      max_age_months: number;
      is_active: boolean;
    };
    progress: {
      id: number;
      is_completed: boolean;
      confirmed_at: string | null;
      note: string | null;
    } | null;
  }>
>([]);
  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [childrenRaw, setChildrenRaw] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string>('main');
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [activeCategory, setActiveCategory] = useState<MilestoneCategory>('gross_motor');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const timelineScrollRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    try {
      const [childrenRes, activeRes] = await Promise.all([
        api.get<Child[]>('/api/families/children/'),
        api.get<ActiveChildResponse>('/api/families/active-child/'),
      ]);

      if (!childrenRes || childrenRes.length === 0) {
        setChildrenList([]);
        setChildrenRaw([]);
        setCompletedIds(new Set());
        setSelectedMonth(1);
        setActiveChildId('main');
        setActiveChildIndex(0);
        return;
      }

      setChildrenRaw(childrenRes);

      const list: ChildChip[] = childrenRes.map((c) => {
        const age = c.age_months || 1;
        const g = getAgeGroupFromMonths(age);

        return {
          id: String(c.id),
          name: c.first_name || 'Ребёнок',
          tag: formatAgeLabel(age),
          ageGroup: g,
          color: c.is_primary ? '#3B82F6' : '#10B981',
          // @ts-ignore
          ageMonths: age,
        };
      });

      setChildrenList(list);

      const backendActiveId = activeRes?.active_child?.id ? String(activeRes.active_child.id) : null;
      let idx = 0;

      if (backendActiveId) {
        const byId = list.findIndex((c) => c.id === backendActiveId);
        idx = byId !== -1 ? byId : 0;
      }

      idx = clamp(idx, 0, list.length - 1);

      const resolved = list[idx] ?? list[0];
      setActiveChildIndex(idx);
      setActiveChildId(resolved?.id ?? String(childrenRes[0].id));

      // @ts-ignore
      const ageMonths = resolved?.ageMonths || 1;
      setSelectedMonth(ageMonths < 1 ? 1 : ageMonths);
    } catch (e: any) {
      console.warn(e);

      if (e?.detail === 'Учетные данные не были предоставлены.') {
        router.replace('/login');
        return;
      }

      if (e?.detail === 'Семья не найдена.') {
        setChildrenList([]);
        setChildrenRaw([]);
        setCompletedIds(new Set());
        setSelectedMonth(1);
        setActiveChildId('main');
        setActiveChildIndex(0);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const child = childrenList[activeChildIndex];
    if (!child) return;
    // @ts-ignore
    const age = child.ageMonths || 1;
    setSelectedMonth(age);
  }, [activeChildIndex, childrenList]);

  const handleChildChange = async (index: number) => {
    const child = childrenList[index];
    if (!child) return;

    try {
      setActiveChildIndex(index);
      setActiveChildId(child.id);

      await api.post('/api/families/active-child/set/', {
        child_id: Number(child.id),
      });
    } catch (e: any) {
      console.warn(e);
    }
  };

const fetchProgress = useCallback(async () => {
  const child = childrenList[activeChildIndex];
  if (!child?.id) return;

  try {
    const progress = await api.get<MilestoneProgressResponse>(
      `/api/milestones/children/${child.id}/progress/`
    );

    setProgressItems(progress?.items || []);

    const ids = new Set(
      (progress?.items || [])
        .filter((item) => !!item.progress?.is_completed)
        .map((item) => String(item.milestone.id))
    );

    setCompletedIds(ids);
  } catch (e: any) {
    console.warn(e);
  }
}, [childrenList, activeChildIndex]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

const milestonesList = useMemo(() => {
  return progressItems
    .filter((item) => {
      const slug = item.milestone.category?.slug;
      const matchesCategory = slug === activeCategory;

      const monthMatch =
        selectedMonth >= item.milestone.min_age_months &&
        selectedMonth <= item.milestone.max_age_months;

      return matchesCategory && monthMatch;
    })
    .map((item) => ({
      id: String(item.milestone.id),
      title: item.milestone.title,
      description: item.milestone.description,
      progress: item.progress,
    }));
}, [progressItems, activeCategory, selectedMonth]);

const handleToggle = async (id: string) => {
  const child = childrenList[activeChildIndex];
  if (!child?.id) return;

  const backendMilestoneId = Number(id);
  const isCurrentlyCompleted = completedIds.has(id);

  try {
    const newSet = new Set(completedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCompletedIds(newSet);

    await api.post(`/api/milestones/${backendMilestoneId}/toggle/`, {
      child_id: Number(child.id),
      is_completed: !isCurrentlyCompleted,
      note: !isCurrentlyCompleted ? 'Отмечено пользователем' : 'Снято пользователем',
    });

    await fetchProgress();
  } catch (e: any) {
    console.warn(e);
    await fetchProgress();
  }
};

  useEffect(() => {
    if (selectedMonth > 0 && timelineScrollRef.current) {
      const index = TIMELINE_DATA.findIndex((item) => item.value === selectedMonth);
      if (index !== -1) {
        const x =
          index * ITEM_ESTIMATED_WIDTH - SCREEN_WIDTH / 2 + ITEM_ESTIMATED_WIDTH / 2;

        setTimeout(
          () => timelineScrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true }),
          300
        );
      }
    }
  }, [selectedMonth]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const currentMeta = MILESTONE_META[activeCategory];
  // @ts-ignore
  const childRealAge = childrenList[activeChildIndex]?.ageMonths || 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        childrenList={childrenList}
        activeChildIndex={activeChildIndex}
        onChangeChild={handleChildChange}
        onLogout={async () => {
          try {
            await logoutRequest();
          } finally {
            router.replace('/login');
          }
        }}
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
              const isSel = item.value === selectedMonth;
              const isCurrentAge = item.value === childRealAge;

              return (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => setSelectedMonth(item.value)}
                  style={[
                    styles.timelineItem,
                    isSel && styles.timelineItemSelected,
                    isCurrentAge && !isSel && styles.timelineItemCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.timelineText,
                      isSel && { color: '#FFF' },
                      isCurrentAge && !isSel && { color: '#6366F1', fontWeight: '700' },
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {(Object.keys(MILESTONE_META) as MilestoneCategory[]).map((key) => {
                const meta = MILESTONE_META[key];
                const isSel = key === activeCategory;

                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setActiveCategory(key)}
                    style={[styles.catCard, isSel && { borderColor: meta.color, borderWidth: 2 }]}
                  >
                    <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
                    <Text style={[styles.catTitle, isSel && { color: meta.color, fontWeight: '800' }]}>
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.listSection}>
            <LinearGradient colors={currentMeta.gradient} style={styles.headerGradient}>
              <Text style={styles.headerTitle}>{currentMeta.label}</Text>
              <Text style={styles.headerSubtitle}>
                {selectedMonth < 48 ? `${selectedMonth} месяц` : `${selectedMonth / 12} лет`}
              </Text>
            </LinearGradient>

            {milestonesList.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: '#94A3B8' }}>Нет данных для этого месяца</Text>
              </View>
            ) : (
              milestonesList.map((item) => {
                const isDone = completedIds.has(item.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => handleToggle(item.id)}
                    style={[
                      styles.milestoneCard,
                      isDone && { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.mTitle,
                          isDone && { textDecorationLine: 'line-through', color: '#16A34A' },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.mDesc}>{item.description}</Text>
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        isDone && { backgroundColor: '#16A34A', borderColor: '#16A34A' },
                      ]}
                    >
                      {isDone && <Ionicons name="checkmark" size={16} color="#FFF" />}
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

export default MilestonesScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  timelineContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  timelineContent: { paddingHorizontal: 16 },
  timelineItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
    position: 'relative',
  },
  timelineItemSelected: { backgroundColor: '#334155' },
  timelineItemCurrent: { borderWidth: 1, borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  timelineText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
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

  categoriesSection: { marginTop: 20 },
  catCard: {
    width: 90,
    height: 90,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catTitle: { fontSize: 11, fontWeight: '600', color: '#334155', marginTop: 4 },

  listSection: { padding: 20 },
  headerGradient: { padding: 20, borderRadius: 20, marginBottom: 16 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },

  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  mTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  mDesc: { fontSize: 13, color: '#64748B' },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  emptyState: { padding: 20, alignItems: 'center' },
});