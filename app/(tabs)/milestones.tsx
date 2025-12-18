// app/(tabs)/milestones.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ExtraChild = {
  id: string;
  name: string;
  birthMonth: string;
  birthYear: string;
};

// те же возрастные группы, что и в других экранах
type AgeGroup = 'baby' | 'toddler' | 'preschool' | 'unknown';

type MilestoneCategory =
  | 'gross_motor'
  | 'fine_motor'
  | 'cognitive'
  | 'speech'
  | 'self_care'
  | 'social_emotional';

type MilestoneItem = {
  id: string;
  category: MilestoneCategory;
  ageGroups: AgeGroup[];
  title: string;
  description: string;
  icon: string;
  highlight?: boolean;
  level: 'beginner' | 'intermediate' | 'advanced';
};

type MilestoneCategoryMeta = {
  label: string;
  shortLabel: string;
  emoji: string;
  gradient: readonly [string, string, string];
  color: string;
};

type AgeInfo = {
  ageGroup: AgeGroup;
  months: number | null;
};

// ----------------- вспомогательные функции -----------------

const calculateAgeMonths = (
  monthStr?: string | null,
  yearStr?: string | null
): number | null => {
  const month = monthStr ? parseInt(monthStr, 10) : NaN;
  const year = yearStr ? parseInt(yearStr, 10) : NaN;

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const ageMonths = (nowYear - year) * 12 + (nowMonth - month);
  if (ageMonths < 0) return null;
  return ageMonths;
};

const ageGroupFromMonths = (months: number | null): AgeGroup => {
  if (months == null) return 'unknown';
  if (months < 12) return 'baby';
  if (months < 36) return 'toddler';
  return 'preschool';
};

const formatAgeLabel = (months: number | null): string => {
  if (months == null) return 'возраст не указан';
  if (months < 12) return `${months} мес`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return `${years} г.`;
  return `${years} г. ${rest} мес`;
};

const getAgeGroupEmoji = (ageGroup: AgeGroup): string => {
  switch (ageGroup) {
    case 'baby': return '👶';
    case 'toddler': return '🧒';
    case 'preschool': return '👦';
    default: return '👤';
  }
};

const getLevelColor = (level: string): string => {
  switch (level) {
    case 'beginner': return '#10B981';
    case 'intermediate': return '#F59E0B';
    case 'advanced': return '#EF4444';
    default: return '#6B7280';
  }
};

const getLevelLabel = (level: string): string => {
  switch (level) {
    case 'beginner': return 'Начальный';
    case 'intermediate': return 'Средний';
    case 'advanced': return 'Продвинутый';
    default: return '';
  }
};

// ----------------- константы категорий и этапов -----------------

const CATEGORY_META: Record<MilestoneCategory, MilestoneCategoryMeta> = {
  gross_motor: {
    label: 'Движение',
    shortLabel: 'Движение',
    emoji: '🏃',
    gradient: ['#A3E635', '#84CC16', '#65A30D'] as const,
    color: '#84CC16',
  },
  fine_motor: {
    label: 'Ловкость',
    shortLabel: 'Ловкость',
    emoji: '✋',
    gradient: ['#06B6D4', '#0891B2', '#0C4A6E'] as const,
    color: '#0891B2',
  },
  cognitive: {
    label: 'Мышление',
    shortLabel: 'Мышление',
    emoji: '🧠',
    gradient: ['#8B5CF6', '#7C3AED', '#5B21B6'] as const,
    color: '#7C3AED',
  },
  speech: {
    label: 'Речь',
    shortLabel: 'Речь',
    emoji: '🗣️',
    gradient: ['#F97316', '#EA580C', '#C2410C'] as const,
    color: '#EA580C',
  },
  self_care: {
    label: 'Самостоятельность',
    shortLabel: 'Сам уход',
    emoji: '✨',
    gradient: ['#22C55E', '#16A34A', '#15803D'] as const,
    color: '#16A34A',
  },
  social_emotional: {
    label: 'Эмоции',
    shortLabel: 'Эмоции',
    emoji: '😊',
    gradient: ['#EC4899', '#DB2777', '#BE185D'] as const,
    color: '#DB2777',
  },
};

// простой «каталог» этапов
const STAGE_LABELS: Record<AgeGroup, string> = {
  baby: '0–12 месяцев',
  toddler: '1–3 года',
  preschool: '3–6 лет',
  unknown: 'возраст не указан',
};

// ----------------- библиотека этапов -----------------

const MILESTONES: MilestoneItem[] = [
  // BABY (0–12 мес)
  {
    id: 'gm-baby-1',
    category: 'gross_motor',
    ageGroups: ['baby'],
    icon: '🤸',
    title: 'Держит голову',
    description: 'Лёжа на животе, поднимает голову на несколько секунд',
    highlight: true,
    level: 'beginner',
  },
  {
    id: 'gm-baby-2',
    category: 'gross_motor',
    ageGroups: ['baby'],
    icon: '🔄',
    title: 'Переворачивается',
    description: 'Со спины на живот и обратно без помощи',
    level: 'intermediate',
  },
  {
    id: 'fm-baby-1',
    category: 'fine_motor',
    ageGroups: ['baby'],
    icon: '🤏',
    title: 'Хватает предметы',
    description: 'Сжимает и удерживает игрушку в руке',
    highlight: true,
    level: 'beginner',
  },
  {
    id: 'cog-baby-1',
    category: 'cognitive',
    ageGroups: ['baby'],
    icon: '👀',
    title: 'Следит взглядом',
    description: 'Следит за движущимися предметами и лицами',
    level: 'beginner',
  },
  {
    id: 'speech-baby-1',
    category: 'speech',
    ageGroups: ['baby'],
    icon: '👂',
    title: 'Реагирует на звуки',
    description: 'Поворачивает голову на знакомые голоса',
    level: 'beginner',
  },
  {
    id: 'social-baby-1',
    category: 'social_emotional',
    ageGroups: ['baby'],
    icon: '😊',
    title: 'Улыбается в ответ',
    description: 'Отвечает улыбкой на общение со взрослым',
    highlight: true,
    level: 'beginner',
  },

  // TODDLER (1–3 года)
  {
    id: 'gm-toddler-1',
    category: 'gross_motor',
    ageGroups: ['toddler'],
    icon: '🏃',
    title: 'Ходит уверенно',
    description: 'Самостоятельно ходит, не держась за опору',
    highlight: true,
    level: 'intermediate',
  },
  {
    id: 'fm-toddler-1',
    category: 'fine_motor',
    ageGroups: ['toddler'],
    icon: '🧩',
    title: 'Собирает пазлы',
    description: 'Вкладывает фигуры в соответствующие отверстия',
    level: 'intermediate',
  },
  {
    id: 'cog-toddler-1',
    category: 'cognitive',
    ageGroups: ['toddler'],
    icon: '🏗️',
    title: 'Строит башню',
    description: 'Ставит кубики друг на друга (3-5 штук)',
    level: 'intermediate',
  },
  {
    id: 'speech-toddler-1',
    category: 'speech',
    ageGroups: ['toddler'],
    icon: '💬',
    title: 'Говорит слова',
    description: 'Использует простые слова для общения',
    highlight: true,
    level: 'intermediate',
  },
  {
    id: 'self-toddler-1',
    category: 'self_care',
    ageGroups: ['toddler'],
    icon: '🍽️',
    title: 'Ест самостоятельно',
    description: 'Держит ложку и кушает без большой помощи',
    level: 'intermediate',
  },
  {
    id: 'social-toddler-1',
    category: 'social_emotional',
    ageGroups: ['toddler'],
    icon: '👫',
    title: 'Играет рядом',
    description: 'Начинает взаимодействовать с другими детьми',
    level: 'beginner',
  },

  // PRESCHOOL (3–6 лет)
  {
    id: 'gm-preschool-1',
    category: 'gross_motor',
    ageGroups: ['preschool'],
    icon: '🤸‍♂️',
    title: 'Прыгает на месте',
    description: 'Прыгает на двух ногах, отрываясь от пола',
    level: 'advanced',
  },
  {
    id: 'fm-preschool-1',
    category: 'fine_motor',
    ageGroups: ['preschool'],
    icon: '✏️',
    title: 'Рисует фигуры',
    description: 'Рисует круг, квадрат и простые линии',
    highlight: true,
    level: 'advanced',
  },
  {
    id: 'cog-preschool-1',
    category: 'cognitive',
    ageGroups: ['preschool'],
    icon: '🧮',
    title: 'Считает до 10',
    description: 'Знает числа и может посчитать предметы',
    level: 'advanced',
  },
  {
    id: 'speech-preschool-1',
    category: 'speech',
    ageGroups: ['preschool'],
    icon: '📖',
    title: 'Рассказывает истории',
    description: 'Составляет предложения и пересказывает события',
    highlight: true,
    level: 'advanced',
  },
  {
    id: 'self-preschool-1',
    category: 'self_care',
    ageGroups: ['preschool'],
    icon: '👕',
    title: 'Одевается сам',
    description: 'Надевает простую одежду с минимальной помощью',
    level: 'advanced',
  },
  {
    id: 'social-preschool-1',
    category: 'social_emotional',
    ageGroups: ['preschool'],
    icon: '🤗',
    title: 'Выражает эмоции',
    description: 'Может назвать и объяснить свои чувства',
    highlight: true,
    level: 'advanced',
  },
];

// ----------------- экран -----------------

const MilestonesScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [ageMap, setAgeMap] = useState<Record<string, AgeInfo>>({});
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  const [activeCategory, setActiveCategory] =
    useState<MilestoneCategory>('gross_motor');

  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  // загрузка детей и возрастов
  useEffect(() => {
    const load = async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          'childName',
          'childBirthMonth',
          'childBirthYear',
          'extraChildren',
        ]);

        const map: Record<string, string | null> = Object.fromEntries(
          entries.map(([k, v]) => [k, v ?? null])
        );

        const list: ChildChip[] = [];
        const ages: Record<string, AgeInfo> = {};

        const mainName =
          map.childName && map.childName.trim().length > 0
            ? map.childName
            : 'Ребёнок';

        const mainMonths = calculateAgeMonths(
          map.childBirthMonth,
          map.childBirthYear
        );
        const mainGroup = ageGroupFromMonths(mainMonths);
        const mainId = 'main';

        list.push({
          id: mainId,
          name: mainName,
          tag: 'Основной профиль',
          color: '#6366F1',
          emoji: getAgeGroupEmoji(mainGroup),
        });

        ages[mainId] = { ageGroup: mainGroup, months: mainMonths };

        if (map.extraChildren) {
          try {
            const parsed = JSON.parse(map.extraChildren) as ExtraChild[];
            if (Array.isArray(parsed)) {
              parsed.forEach((c, index) => {
                const months = calculateAgeMonths(c.birthMonth, c.birthYear);
                const group = ageGroupFromMonths(months);
                const id = c.id;

                list.push({
                  id,
                  name:
                    c.name && c.name.trim().length > 0
                      ? c.name
                      : `Ребёнок ${index + 2}`,
                  tag: 'Дополнительно',
                  color:
                    group === 'baby'
                      ? '#3B82F6'
                      : group === 'toddler'
                      ? '#10B981'
                      : '#8B5CF6',
                  emoji: getAgeGroupEmoji(group),
                });

                ages[id] = { ageGroup: group, months };
              });
            }
          } catch (e) {
            console.warn('Error parsing extraChildren in Milestones screen', e);
          }
        }

        if (list.length === 0) {
          list.push({
            id: 'fallback',
            name: 'Ребёнок',
            tag: 'Профиль',
            color: '#6B7280',
            emoji: '👤',
          });
          ages['fallback'] = { ageGroup: 'unknown', months: null };
        }

        setChildrenList(list);
        setAgeMap(ages);
      } catch (e) {
        console.warn('Error loading milestones data', e);
        setChildrenList([
          {
            id: 'fallback',
            name: 'Ребёнок',
            tag: 'Профиль',
            color: '#6B7280',
            emoji: '👤',
          },
        ]);
        setAgeMap({
          fallback: { ageGroup: 'unknown', months: null },
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activeChild = childrenList[activeChildIndex] ?? childrenList[0];
  const activeChildId = activeChild?.id ?? '';
  const ageInfo: AgeInfo =
    (activeChildId && ageMap[activeChildId]) || {
      ageGroup: 'unknown',
      months: null,
    };

  const activeAgeGroup = ageInfo.ageGroup;

  // фильтрация этапов под возраст
  const milestonesForChild = useMemo(() => {
    return MILESTONES.filter((m) =>
      activeAgeGroup === 'unknown'
        ? true
        : m.ageGroups.includes(activeAgeGroup)
    );
  }, [activeAgeGroup]);

  const milestonesInCategory = useMemo(() => {
    return milestonesForChild.filter(
      (m) => m.category === activeCategory
    );
  }, [milestonesForChild, activeCategory]);

  // прогресс по категории
  const completedCount = milestonesInCategory.filter(
    (m) => completedMap[m.id]
  ).length;
  const totalCount = milestonesInCategory.length;
  const progressPct =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleToggle = (id: string) => {
    setCompletedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'hasOnboarded',
        'isLoggedIn',
        'parentName',
        'parentRole',
        'parentEmail',
        'parentPhone',
        'parentPassword',
        'childName',
        'childBirthMonth',
        'childBirthYear',
        'language',
        'extraChildren',
      ]);
      router.replace('/login');
    } catch (error) {
      console.warn('Error clearing storage:', error);
      router.replace('/login');
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#6366F1', '#8B5CF6'] as const}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </LinearGradient>
    );
  }

  const categoryOrder: MilestoneCategory[] = [
    'gross_motor',
    'fine_motor',
    'cognitive',
    'speech',
    'self_care',
    'social_emotional',
  ];

  const activeMeta = CATEGORY_META[activeCategory];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        childrenList={childrenList}
        activeChildIndex={activeChildIndex}
        onChangeChild={setActiveChildIndex}
        onLogout={handleLogout}
      />

      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Шапка с приветствием */}
          <View style={styles.header}>
            <View style={styles.headerContent}>

              <Text style={styles.headerTitle}>Этапы развития</Text>
              <Text style={styles.headerSubtitle}>
                Отмечайте достижения {activeChild?.name} и следите за прогрессом
              </Text>
            </View>
            
            
          </View>

          {/* Категории - горизонтальный скролл */}
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Области развития</Text>
              <Text style={styles.sectionSubtitle}>Выберите категорию</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
              style={styles.categoriesScroll}
            >
              {categoryOrder.map((key) => {
                const meta = CATEGORY_META[key];
                const selected = key === activeCategory;
                
                // Рассчитываем прогресс для этой категории
                const categoryMilestones = milestonesForChild.filter(m => m.category === key);
                const categoryCompleted = categoryMilestones.filter(m => completedMap[m.id]).length;
                const categoryProgress = categoryMilestones.length > 0 
                  ? Math.round((categoryCompleted / categoryMilestones.length) * 100) 
                  : 0;

                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.9}
                    onPress={() => setActiveCategory(key)}
                    style={styles.categoryCardWrapper}
                  >
                    <LinearGradient
                      colors={selected ? meta.gradient : ['#FFFFFF', '#FFFFFF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.categoryCard,
                        selected && styles.categoryCardSelected,
                      ]}
                    >
                      <View style={styles.categoryCardContent}>
                        <View style={styles.categoryCardHeader}>
                          <View style={[
                            styles.categoryIconWrapper,
                            { 
                              backgroundColor: selected 
                                ? 'rgba(255,255,255,0.2)' 
                                : `${meta.color}10`
                            }
                          ]}>
                            <Text style={[
                              styles.categoryIcon,
                              selected && styles.categoryIconSelected
                            ]}>
                              {meta.emoji}
                            </Text>
                          </View>
                          
                          {selected && (
                            <View style={styles.selectedBadge}>
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        
                        <Text style={[
                          styles.categoryTitle,
                          selected && styles.categoryTitleSelected
                        ]}>
                          {meta.label}
                        </Text>
                        
                        <Text style={[
                          styles.categoryProgressText,
                          selected && styles.categoryProgressTextSelected
                        ]}>
                          {categoryCompleted}/{categoryMilestones.length}
                        </Text>
                        
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBarBackground}>
                            <LinearGradient
                              colors={meta.gradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[
                                styles.progressBarFill,
                                { width: `${categoryProgress}%` }
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Активная категория - задания в стиле прогресса */}
          <View style={styles.milestonesSection}>
<LinearGradient
  colors={activeMeta.gradient}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.activeCategoryHeader}
>
  <View style={styles.categoryHeaderContent}>
    <View style={styles.categoryHeaderIcon}>
      <Text style={styles.categoryHeaderEmoji}>{activeMeta.emoji}</Text>
    </View>
    <View style={styles.categoryHeaderText}>
      <Text style={styles.categoryHeaderTitle} numberOfLines={1}>
        {activeMeta.label}
      </Text>
      <Text style={styles.categoryHeaderSubtitle} numberOfLines={1}>
        {completedCount} из {totalCount} этапов
      </Text>
    </View>
    
    <View style={styles.progressCircle}>
      <Text style={styles.progressCircleText}>{progressPct}%</Text>
    </View>
  </View>
</LinearGradient>

            {/* Задания */}
            <View style={styles.milestonesList}>
              {milestonesInCategory.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrapper}>
                    <Ionicons name="sparkles-outline" size={48} color="#CBD5E1" />
                  </View>
                  <Text style={styles.emptyTitle}>Пока нет этапов</Text>
                  <Text style={styles.emptyDescription}>
                    Для этой категории и возраста этапы пока не добавлены.
                  </Text>
                </View>
              ) : (
                milestonesInCategory.map((item) => {
                  const done = !!completedMap[item.id];
                  const levelColor = getLevelColor(item.level);
                  
                  return (
                    <View key={item.id} style={styles.milestoneItem}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => handleToggle(item.id)}
                        style={[
                          styles.milestoneCard,
                          done && styles.milestoneCardDone
                        ]}
                      >
                        {/* Левая часть с иконкой */}
                        <View style={styles.milestoneLeft}>
                          <View style={[
                            styles.milestoneIconContainer,
                            done 
                              ? { backgroundColor: `${activeMeta.color}15` }
                              : { backgroundColor: `${activeMeta.color}10` }
                          ]}>
                            <Text style={[
                              styles.milestoneIcon,
                              done && { opacity: 0.7 }
                            ]}>
                              {item.icon}
                            </Text>
                          </View>
                        </View>

                        {/* Центральная часть с информацией */}
                        <View style={styles.milestoneCenter}>
                          <View style={styles.milestoneHeader}>
                            <Text style={[
                              styles.milestoneTitle,
                              done && styles.milestoneTitleDone
                            ]}>
                              {item.title}
                            </Text>
                            <View style={[
                              styles.levelBadge,
                              { backgroundColor: `${levelColor}15` }
                            ]}>
                              <View style={[
                                styles.levelDot,
                                { backgroundColor: levelColor }
                              ]} />
                              <Text style={[
                                styles.levelText,
                                { color: levelColor }
                              ]}>
                                {getLevelLabel(item.level)}
                              </Text>
                            </View>
                          </View>
                          
                          <Text style={[
                            styles.milestoneDescription,
                            done && styles.milestoneDescriptionDone
                          ]}>
                            {item.description}
                          </Text>
                        </View>

                        {/* Правая часть с чекбоксом */}
                        <View style={styles.milestoneRight}>
                          <LinearGradient
                            colors={done ? activeMeta.gradient : ['#FFFFFF', '#FFFFFF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                              styles.checkboxWrapper,
                              !done && styles.checkboxWrapperEmpty
                            ]}
                          >
                            {done ? (
                              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                            ) : (
                              <View style={styles.checkboxInner} />
                            )}
                          </LinearGradient>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Подсказка */}
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Совет от Ava</Text>
              <Text style={styles.tipText}>
                Отмечайте достижения по мере их появления. Это поможет отслеживать прогресс и подбирать подходящие занятия.
              </Text>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <AskAvaFab onPress={() => router.push('/chat' as any)} />
      </View>
    </SafeAreaView>
  );
};

export default MilestonesScreen;

// ----------------- СТИЛИ -----------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },

  body: {
    flex: 1,
    position: 'relative',
  },

  scrollContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },

  // Шапка
  header: {
    paddingHorizontal: 20,
  },
  headerContent: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 18,
  },
  childInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  childEmoji: {
    fontSize: 20,
  },
  childName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  childAge: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },

  // Категории - горизонтальный скролл
  categoriesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  categoriesScroll: {
    marginLeft: 20,
  },
  categoriesScrollContent: {
    paddingRight: 20,
  },
  categoryCardWrapper: {
    width: 140,
    marginRight: 10,
  },
  categoryCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    height: 160,
    overflow: 'hidden',
  },
  categoryCardSelected: {
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  categoryCardContent: {
    padding: 16,
    flex: 1,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryIconSelected: {
    color: '#FFFFFF',
  },
  selectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  categoryTitleSelected: {
    color: '#FFFFFF',
  },
  categoryProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  categoryProgressTextSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  progressContainer: {
    marginTop: 'auto',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Активная категория - компактная версия
  milestonesSection: {
    marginBottom: 20,
  },
  activeCategoryHeader: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 56,
  },
  categoryHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryHeaderEmoji: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  categoryHeaderText: {
    flex: 1,
  },
  categoryHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  categoryHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  progressCircleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Задания (милстоуны)
  milestonesList: {
    paddingHorizontal: 20,
  },
  milestoneItem: {
    marginBottom: 8,
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 72,
  },
  milestoneCardDone: {
    backgroundColor: '#F8FAFC',
  },
  milestoneLeft: {
    marginRight: 12,
  },
  milestoneIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIcon: {
    fontSize: 20,
  },
  milestoneCenter: {
    flex: 1,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  milestoneTitleDone: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  levelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '800',
  },
  milestoneDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  milestoneDescriptionDone: {
    color: '#9CA3AF',
  },
  milestoneRight: {
    marginLeft: 8,
  },
  checkboxWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkboxWrapperEmpty: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // Подсказка
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  // Пустое состояние
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  bottomSpacer: {
    height: 24,
  },
});