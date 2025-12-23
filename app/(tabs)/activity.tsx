// app/(tabs)/activity.tsx

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { getChildProgress } from '../../utils/storage';

import {
  ACTIVITY_LIBRARY,
  ActivityCategory,
  AgeGroup,
  CATEGORY_META,
} from '../activities/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACTIVE_CHILD_ID_KEY = 'activeChildId';
const ACTIVE_CHILD_INDEX_KEY = 'activeChildIndex';

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

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const calculateAgeInMonths = (monthStr?: string | null, yearStr?: string | null): number => {
  const month = monthStr ? parseInt(monthStr, 10) : NaN;
  const year = yearStr ? parseInt(yearStr, 10) : NaN;
  if (isNaN(month) || isNaN(year)) return 0;

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  let age = (nowYear - year) * 12 + (nowMonth - month);
  if (age < 1) age = 1;
  return age;
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

  // ✅ Загружаем детей + активного ребёнка + прогресс НА КАЖДЫЙ ФОКУС
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await AsyncStorage.multiGet([
        'childName',
        'childBirthMonth',
        'childBirthYear',
        'extraChildren',
        'extraChilds', // на случай если где-то сохраняли с таким ключом
        ACTIVE_CHILD_ID_KEY,
        ACTIVE_CHILD_INDEX_KEY,
      ]);

      const map = Object.fromEntries(entries.map(([k, v]) => [k, v ?? null]));

      // --- main child ---
      const baseName = (map.childName as string | null)?.trim() || 'Ребёнок';
      const mainAgeMonths = calculateAgeInMonths(map.childBirthMonth, map.childBirthYear);
      const mainGroup = getAgeGroupFromMonths(mainAgeMonths);

      const list: ChildChip[] = [{
        id: 'main',
        name: baseName,
        tag: formatAgeLabel(mainAgeMonths),
        ageGroup: mainGroup,
        color: '#3B82F6',
        // @ts-ignore
        ageMonths: mainAgeMonths,
      }];

      // --- extra children ---
      const rawExtrasStr = (map.extraChildren as string | null) ?? (map.extraChilds as string | null);
      let extrasChanged = false;

      if (rawExtrasStr) {
        try {
          const parsed = JSON.parse(rawExtrasStr);
          if (Array.isArray(parsed)) {
            // гарантируем id у каждого extra ребёнка (иначе ломается прогресс/переключение)
            const patched = parsed.map((c: any, idx: number) => {
              const hasId = c?.id !== undefined && c?.id !== null && String(c.id).length > 0;
              if (!hasId) extrasChanged = true;
              const id = hasId ? String(c.id) : `ex-${Date.now()}-${idx}`;
              return { ...c, id };
            });

            patched.forEach((c: any, idx: number) => {
              const age = calculateAgeInMonths(c.birthMonth, c.birthYear);
              const grp = getAgeGroupFromMonths(age);

              list.push({
                id: String(c.id),
                name: c?.name || `Ребёнок ${idx + 2}`,
                tag: formatAgeLabel(age),
                ageGroup: grp,
                color: '#10B981',
                // @ts-ignore
                ageMonths: age,
              });
            });

            if (extrasChanged) {
              await AsyncStorage.setItem('extraChildren', JSON.stringify(patched));
            }
          }
        } catch {
          // ignore parse
        }
      }

      setChildrenList(list);

      // --- determine active child (prefer ID) ---
      const savedId = map[ACTIVE_CHILD_ID_KEY] as string | null;
      const savedIndexRaw = map[ACTIVE_CHILD_INDEX_KEY] as string | null;

      let idx = 0;
      if (savedId) {
        const byId = list.findIndex((c) => c.id === savedId);
        idx = byId !== -1 ? byId : 0;
      } else if (savedIndexRaw !== null) {
        const n = Number(savedIndexRaw);
        idx = Number.isFinite(n) ? clamp(n, 0, list.length - 1) : 0;
      }

      const resolvedChild = list[idx] ?? list[0];
      const resolvedId = resolvedChild?.id ?? 'main';

      setActiveChildIndex(idx);
      setActiveChildId(resolvedId);

      // синхронизируем сохранённые значения
      await AsyncStorage.setItem(ACTIVE_CHILD_ID_KEY, resolvedId);
      await AsyncStorage.setItem(ACTIVE_CHILD_INDEX_KEY, String(idx));

      // месяц под активного ребёнка
      // @ts-ignore
      const ageMonths = resolvedChild?.ageMonths || 1;
      setSelectedMonth(ageMonths < 1 ? 1 : ageMonths);

      // ✅ прогресс под активного ребёнка
      if (resolvedId) {
        const progress = await getChildProgress(resolvedId);
        const ids = new Set((progress || []).map((p: any) => p.activityId));
        setCompletedIds(ids);
      } else {
        setCompletedIds(new Set());
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // при смене ребёнка — обновляем месяц и прогресс
  useEffect(() => {
    const child = childrenList[activeChildIndex];
    if (!child?.id) return;

    // @ts-ignore
    const age = child.ageMonths || 1;
    setSelectedMonth(age);

    (async () => {
      const progress = await getChildProgress(child.id);
      const ids = new Set((progress || []).map((p: any) => p.activityId));
      setCompletedIds(ids);
    })();
  }, [activeChildIndex, childrenList]);

  const handleChildChange = async (index: number) => {
    const child = childrenList[index];
    if (!child?.id) return;

    setActiveChildIndex(index);
    setActiveChildId(child.id);

    await AsyncStorage.setItem(ACTIVE_CHILD_ID_KEY, child.id);
    await AsyncStorage.setItem(ACTIVE_CHILD_INDEX_KEY, index.toString());
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
    router.replace('/login');
  };

  // авто-скролл таймлайна
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
        {/* TIMELINE */}
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
          {/* Categories */}
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

          {/* Activities */}
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
                const isCompleted = completedIds.has(activity.id);

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
