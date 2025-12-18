// app/(tabs)/activity.tsx
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

import {
    ACTIVITY_LIBRARY,
    ActivityCategory,
    ActivityItem,
    AgeGroup,
    CATEGORY_META,
} from '../activities/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ExtraChild = {
  id: string;
  name: string;
  birthMonth: string;
  birthYear: string;
};

// =====================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =====================

const calculateAgeGroup = (
  monthStr?: string | null,
  yearStr?: string | null
): AgeGroup => {
  const month = monthStr ? parseInt(monthStr, 10) : NaN;
  const year = yearStr ? parseInt(yearStr, 10) : NaN;

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return 'unknown';

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const ageMonths = (nowYear - year) * 12 + (nowMonth - month);
  if (ageMonths < 0) return 'unknown';
  if (ageMonths < 12) return 'baby';
  if (ageMonths < 36) return 'toddler';
  return 'preschool';
};

const getAgeGroupStyle = (ageGroup: AgeGroup) => {
  switch (ageGroup) {
    case 'baby':
      return { color: '#3B82F6', emoji: '👶' };
    case 'toddler':
      return { color: '#10B981', emoji: '🧒' };
    case 'preschool':
      return { color: '#8B5CF6', emoji: '👦' };
    default:
      return { color: '#6B7280', emoji: '👤' };
  }
};

const ageGroupLabel = (ageGroup: AgeGroup) => {
  switch (ageGroup) {
    case 'baby':
      return '0–1 год';
    case 'toddler':
      return '1–3 года';
    case 'preschool':
      return '3–6 лет';
    default:
      return 'возраст';
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'легко':
      return '#10B981';
    case 'средне':
      return '#F59E0B';
    case 'сложно':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

// порядок категорий
const categoryOrder: ActivityCategory[] = [
  'fine_motor',
  'cognitive',
  'speech',
  'self_care',
  'social_emotional',
  'gross_motor',
];

// =====================
// ЭКРАН
// =====================

const ActivityScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [activeCategory, setActiveCategory] =
    useState<ActivityCategory>('fine_motor');

  // загрузка детей
  useEffect(() => {
    const loadData = async () => {
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

        const baseName =
          map.childName && map.childName.trim().length > 0
            ? map.childName
            : 'Ребёнок';

        const mainAgeGroup = calculateAgeGroup(
          map.childBirthMonth,
          map.childBirthYear
        );
        const mainStyle = getAgeGroupStyle(mainAgeGroup);

        const list: ChildChip[] = [
          {
            id: 'main',
            name: baseName,
            tag: 'Основной профиль',
            ageGroup: mainAgeGroup,
            color: mainStyle.color,
            emoji: mainStyle.emoji,
          },
        ];

        if (map.extraChildren) {
          try {
            const parsed = JSON.parse(map.extraChildren) as ExtraChild[];
            if (Array.isArray(parsed)) {
              parsed.forEach((c, index) => {
                const group = calculateAgeGroup(c.birthMonth, c.birthYear);
                const style = getAgeGroupStyle(group);
                list.push({
                  id: c.id,
                  name:
                    c.name && c.name.trim().length > 0
                      ? c.name
                      : `Ребёнок ${index + 2}`,
                  tag: 'Дополнительно',
                  ageGroup: group,
                  color: style.color,
                  emoji: style.emoji,
                });
              });
            }
          } catch (e) {
            console.warn('Error parsing extraChildren in Activity screen', e);
          }
        }

        if (list.length === 0) {
          list.push({
            id: 'fallback',
            name: 'Ребёнок',
            tag: 'Профиль',
            ageGroup: 'unknown',
            color: '#6B7280',
            emoji: '👤',
          });
        }

        setChildrenList(list);
      } catch (e) {
        console.warn('Error loading Activity data', e);
        setChildrenList([
          {
            id: 'fallback',
            name: 'Ребёнок',
            tag: 'Профиль',
            ageGroup: 'unknown',
            color: '#6B7280',
            emoji: '👤',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const activeChild = childrenList[activeChildIndex] ?? childrenList[0];
  const activeAgeGroup: AgeGroup = activeChild?.ageGroup ?? 'unknown';

  // отфильтрованные активности под возраст и категорию
  const activitiesForChild = useMemo(() => {
    return ACTIVITY_LIBRARY.filter((item) => {
      if (item.category !== activeCategory) return false;
      if (
        activeAgeGroup !== 'unknown' &&
        !item.ageGroups.includes(activeAgeGroup)
      ) {
        return false;
      }
      return true;
    });
  }, [activeCategory, activeAgeGroup]);

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

  const openActivity = (activity: ActivityItem) => {
    router.push({
      pathname: '/activities/[id]' as any,
      params: { id: activity.id },
    });
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

  const currentMeta = CATEGORY_META[activeCategory];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* общий header с выбором ребёнка */}
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
          {/* Приветствие */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Привет! 👋</Text>
            <Text style={styles.welcomeSubtitle}>
              Подобрали активности для {activeChild?.name} · {ageGroupLabel(activeAgeGroup)}
            </Text>
          </View>

          {/* Категории — горизонтальный скролл с большими карточками */}
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Категории развития</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Все</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
              style={styles.categoriesScroll}
              snapToInterval={SCREEN_WIDTH * 0.7 + 16}
              decelerationRate="fast"
            >
              {categoryOrder.map((key) => {
                const meta = CATEGORY_META[key];
                const selected = key === activeCategory;

                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.9}
                    onPress={() => setActiveCategory(key)}
                    style={[
                      styles.categoryCardWrapper,
                      selected && styles.categoryCardWrapperSelected,
                    ]}
                  >
                    <LinearGradient
                      colors={selected ? meta.gradient : ['#FFFFFF', '#F8FAFC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.categoryCard,
                        selected && styles.categoryCardSelected,
                      ]}
                    >
                      <View style={styles.categoryCardHeader}>
                        <View style={[
                          styles.categoryIconWrapper,
                          { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : meta.gradient[0] + '15' }
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
                        styles.categoryDescription,
                        selected && styles.categoryDescriptionSelected
                      ]}>
                        {meta.description}
                      </Text>
                      
                      {!selected && (
                        <View style={styles.categoryButton}>
                          <Text style={styles.categoryButtonText}>Выбрать</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Активности выбранной категории */}
          <View style={styles.activitiesSection}>
            <View style={styles.activitiesHeader}>
              <View>
                <Text style={styles.activitiesTitle}>
                  {currentMeta.label}
                </Text>
                <Text style={styles.activitiesSubtitle}>
                  {activitiesForChild.length} активностей · От простых к сложным
                </Text>
              </View>
              <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="filter-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {activitiesForChild.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrapper}>
                  <Ionicons name="search-outline" size={48} color="#CBD5E1" />
                </View>
                <Text style={styles.emptyTitle}>Пока нет активностей</Text>
                <Text style={styles.emptyDescription}>
                  Для этой категории и возраста активностей пока не добавлено.
                  Попробуйте выбрать другую категорию.
                </Text>
              </View>
            ) : (
              activitiesForChild.map((activity) => {
                const difficultyColor = getDifficultyColor(activity.difficulty);

                return (
                  <TouchableOpacity
                    key={activity.id}
                    activeOpacity={0.92}
                    onPress={() => openActivity(activity)}
                    style={styles.activityCard}
                  >
                    <View style={styles.activityCardContent}>
                      <View style={styles.activityHeader}>
                        <View style={styles.activityCategoryTag}>
                          <LinearGradient
                            colors={currentMeta.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.categoryTagGradient}
                          >
                            <Text style={styles.categoryTagText}>
                              {currentMeta.shortLabel}
                            </Text>
                          </LinearGradient>
                        </View>
                        
                        <View style={styles.activityMetaRow}>
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color="#64748B" />
                            <Text style={styles.metaText}>{activity.minutes} мин</Text>
                          </View>
                          <View style={[
                            styles.difficultyBadge,
                            { backgroundColor: difficultyColor + '15' }
                          ]}>
                            <View style={[
                              styles.difficultyDot,
                              { backgroundColor: difficultyColor }
                            ]} />
                            <Text style={[
                              styles.difficultyText,
                              { color: difficultyColor }
                            ]}>
                              {activity.difficulty}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityDescription}>
                        {activity.subtitle}
                      </Text>
                      
                      <View style={styles.activityFooter}>
                        <View style={styles.skillsContainer}>
                          <Ionicons name="ribbon-outline" size={16} color="#94A3B8" />
                          <Text style={styles.skillsText} numberOfLines={1}>
                            {activity.skills[0]}
                          </Text>
                        </View>
                        
                        <View style={styles.ageBadge}>
                          <Text style={styles.ageEmoji}>
                            {getAgeGroupStyle(activeAgeGroup).emoji}
                          </Text>
                          <Text style={styles.ageText}>
                            {ageGroupLabel(activeAgeGroup)}
                          </Text>
                        </View>
                      </View>
                      
                      <LinearGradient
                        colors={currentMeta.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.playButton}
                      >
                        <Ionicons name="play" size={18} color="#FFFFFF" />
                        <Text style={styles.playButtonText}>Начать</Text>
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <AskAvaFab onPress={() => router.push('/chat' as any)} />
      </View>
    </SafeAreaView>
  );
};

export default ActivityScreen;

// =====================
// СТИЛИ
// =====================

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
    paddingTop: 16,
    paddingBottom: 120,
  },

  // Приветствие
  welcomeSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '500',
  },

  // Секция заголовка
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Категории (горизонтальный скролл)
  categoriesSection: {
    marginBottom: 32,
  },
  categoriesScroll: {
    marginLeft: 24,
  },
  categoriesScrollContent: {
    paddingRight: 24,
  },
  categoryCardWrapper: {
    width: SCREEN_WIDTH * 0.7,
    marginRight: 16,
  },
  categoryCardWrapperSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  categoryCard: {
    borderRadius: 24,
    padding: 24,
    height: 200,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  categoryCardSelected: {
    borderWidth: 0,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryIconSelected: {
    color: '#FFFFFF',
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  categoryTitleSelected: {
    color: '#FFFFFF',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
    flex: 1,
  },
  categoryDescriptionSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  categoryButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },

  // Активности
  activitiesSection: {
    paddingHorizontal: 24,
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  activitiesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  activitiesSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Карточка активности
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityCardContent: {
    padding: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activityCategoryTag: {
    overflow: 'hidden',
    borderRadius: 10,
  },
  categoryTagGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '800',
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 24,
  },
  activityDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 20,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  skillsText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  ageEmoji: {
    fontSize: 14,
  },
  ageText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Пустое состояние
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 32,
  },
});