import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router'; // <--- Добавил useFocusEffect

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

// Импортируем данные и сторадж
import { getMilestonesProgress, toggleMilestone } from '../../utils/storage';
import { AgeGroup } from '../activities/data';
import { MILESTONE_LIBRARY, MILESTONE_META, MilestoneCategory } from '../milestones/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

const generateTimeline = () => {
  const timeline = [];
  for (let i = 1; i <= 36; i++) timeline.push({ value: i, label: `${i} мес`, type: 'month' });
  timeline.push({ value: 48, label: '4 года', type: 'year' });
  timeline.push({ value: 60, label: '5 лет', type: 'year' });
  timeline.push({ value: 72, label: '6 лет', type: 'year' });
  return timeline;
};
const TIMELINE_DATA = generateTimeline();
const ITEM_ESTIMATED_WIDTH = 85;

const calculateAgeInMonths = (mStr?: string | null, yStr?: string | null): number => {
  const m = mStr ? parseInt(mStr, 10) : 0;
  const y = yStr ? parseInt(yStr, 10) : 0;
  if (!m || !y) return 0;
  const now = new Date();
  let age = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return age < 1 ? 1 : age;
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
  if(m < 12) return 'baby'; 
  if(m < 36) return 'toddler'; 
  if(m < 84) return 'preschool'; 
  return 'school' as any;
};

const getAgeGroupStyle = (g: AgeGroup) => {
  switch(g){
    case 'baby': return {color:'#3B82F6'};
    case 'toddler': return {color:'#10B981'};
    case 'preschool': return {color:'#8B5CF6'};
    default: return {color:'#F59E0B'};
  }
};

// --- КОМПОНЕНТ ---

const MilestonesScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [activeCategory, setActiveCategory] = useState<MilestoneCategory>('gross_motor');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const timelineScrollRef = useRef<ScrollView>(null);

  // 1. Загрузка детей
  useEffect(() => {
    const loadData = async () => {
      try {
        const entries = await AsyncStorage.multiGet(['childName', 'childBirthMonth', 'childBirthYear', 'extraChildren']);
        const map = Object.fromEntries(entries.map(([k, v]) => [k, v]));
        
        const mainMonths = calculateAgeInMonths(map.childBirthMonth, map.childBirthYear);
        const grp = getAgeGroupFromMonths(mainMonths);
        const style = getAgeGroupStyle(grp);

        const list: ChildChip[] = [{
            id: 'main', 
            name: map.childName || 'Ребёнок', 
            tag: formatAgeLabel(mainMonths), 
            ageGroup: grp, 
            color: '#3B82F6',
            // @ts-ignore
            ageMonths: mainMonths
        }];
        
        if(map.extraChildren) {
          try {
            const ex = JSON.parse(map.extraChildren);
            if (Array.isArray(ex)) {
              ex.forEach((c: any) => {
                const age = calculateAgeInMonths(c.birthMonth, c.birthYear);
                const s = getAgeGroupStyle(getAgeGroupFromMonths(age));
                list.push({
                  id: c.id, 
                  name: c.name, 
                  tag: formatAgeLabel(age), 
                  ageGroup: getAgeGroupFromMonths(age), 
                  color: '#10B981', 
                  // @ts-ignore
                  ageMonths: age
                });
              });
            }
          } catch(e){}
        }
        setChildrenList(list);
        setSelectedMonth(mainMonths < 1 ? 1 : mainMonths);
      } catch(e) { console.warn(e); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  // 2. Синхронизация шкалы при смене ребенка
  useEffect(() => {
    const child = childrenList[activeChildIndex];
    if (child) {
      // @ts-ignore
      const age = child.ageMonths || 1;
      setSelectedMonth(age);
    }
  }, [activeChildIndex, childrenList]);
useFocusEffect(
  useCallback(() => {
    const syncChild = async () => {
      const savedIndex = await AsyncStorage.getItem('activeChildIndex');
      if (savedIndex !== null) {
        setActiveChildIndex(parseInt(savedIndex, 10));
      }
    };
    syncChild();
  }, [])
);

const handleChildChange = async (index: number) => {
    setActiveChildIndex(index);
    await AsyncStorage.setItem('activeChildIndex', index.toString());
};
  // 3. Загрузка прогресса
  const fetchProgress = useCallback(async () => {
      if(childrenList.length === 0) return;
      const child = childrenList[activeChildIndex];
      const ids = await getMilestonesProgress(child.id);
      setCompletedIds(new Set(ids));
  }, [childrenList, activeChildIndex]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  // 4. Фильтрация
  const milestonesList = useMemo(() => {
      return MILESTONE_LIBRARY.filter(m => 
          m.category === activeCategory && m.month === selectedMonth
      );
  }, [activeCategory, selectedMonth]);

  const handleToggle = async (id: string) => {
      const child = childrenList[activeChildIndex];
      if(!child) return;
      const newSet = new Set(completedIds);
      if(newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setCompletedIds(newSet);
      await toggleMilestone(child.id, id);
  };

  // Авто-скролл
  useEffect(() => {
    if (selectedMonth > 0 && timelineScrollRef.current) {
      const index = TIMELINE_DATA.findIndex((item) => item.value === selectedMonth);
      if (index !== -1) {
        const x = (index * ITEM_ESTIMATED_WIDTH) - (SCREEN_WIDTH / 2) + (ITEM_ESTIMATED_WIDTH / 2);
        setTimeout(() => timelineScrollRef.current?.scrollTo({x: Math.max(0, x), animated: true}), 300);
      }
    }
  }, [selectedMonth]);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#6366F1"/></View>;

  const currentMeta = MILESTONE_META[activeCategory];
  // @ts-ignore
  const childRealAge = childrenList[activeChildIndex]?.ageMonths || 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        childrenList={childrenList}
        activeChildIndex={activeChildIndex}
        onChangeChild={handleChildChange}
        onLogout={() => router.replace('/login')}
      />

      <View style={styles.body}>
        <View style={styles.timelineContainer}>
            <ScrollView ref={timelineScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineContent}>
                {TIMELINE_DATA.map(item => {
                    const isSel = item.value === selectedMonth;
                    // Подсветка реального возраста ребенка
                    const isCurrentAge = item.value === childRealAge;

                    return (
                        <TouchableOpacity 
                          key={item.label} 
                          onPress={() => setSelectedMonth(item.value)}
                          style={[
                            styles.timelineItem, 
                            isSel && styles.timelineItemSelected,
                            isCurrentAge && !isSel && styles.timelineItemCurrent
                          ]}
                        >
                            <Text style={[
                              styles.timelineText, 
                              isSel && {color:'#FFF'},
                              isCurrentAge && !isSel && {color:'#6366F1', fontWeight:'700'}
                            ]}>
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
                    {(Object.keys(MILESTONE_META) as MilestoneCategory[]).map(key => {
                        const meta = MILESTONE_META[key];
                        const isSel = key === activeCategory;
                        return (
                            <TouchableOpacity key={key} onPress={() => setActiveCategory(key)} style={[styles.catCard, isSel && {borderColor: meta.color, borderWidth: 2}]}>
                                <Text style={{fontSize:24}}>{meta.emoji}</Text>
                                <Text style={[styles.catTitle, isSel && {color: meta.color, fontWeight:'800'}]}>{meta.label}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </ScrollView>
            </View>

            <View style={styles.listSection}>
                <LinearGradient colors={currentMeta.gradient} style={styles.headerGradient}>
                    <Text style={styles.headerTitle}>{currentMeta.label}</Text>
                    <Text style={styles.headerSubtitle}>{selectedMonth < 48 ? `${selectedMonth} месяц` : `${selectedMonth/12} лет`}</Text>
                </LinearGradient>

                {milestonesList.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{color:'#94A3B8'}}>Нет данных для этого месяца</Text>
                    </View>
                ) : (
                    milestonesList.map(item => {
                        const isDone = completedIds.has(item.id);
                        return (
                            <TouchableOpacity key={item.id} activeOpacity={0.8} onPress={() => handleToggle(item.id)}
                                style={[styles.milestoneCard, isDone && {backgroundColor:'#F0FDF4', borderColor:'#86EFAC'}]}>
                                <View style={{flex:1}}>
                                    <Text style={[styles.mTitle, isDone && {textDecorationLine:'line-through', color:'#16A34A'}]}>{item.title}</Text>
                                    <Text style={styles.mDesc}>{item.description}</Text>
                                </View>
                                <View style={[styles.checkbox, isDone && {backgroundColor:'#16A34A', borderColor:'#16A34A'}]}>
                                    {isDone && <Ionicons name="checkmark" size={16} color="#FFF"/>}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>
        </ScrollView>
        <AskAvaFab onPress={() => router.push('/chat' as any)}/>
      </View>
    </SafeAreaView>
  );
};

export default MilestonesScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: {flex:1, justifyContent:'center', alignItems:'center'},
  body: {flex:1},
  scrollContent: {paddingBottom: 100},
  timelineContainer: { paddingVertical: 12, backgroundColor:'#FFF', borderBottomWidth:1, borderColor:'#F1F5F9'},
  timelineContent: { paddingHorizontal: 16 },
  timelineItem: { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:'#F1F5F9', marginRight:8, minWidth:60, alignItems:'center', position:'relative'},
  timelineItemSelected: { backgroundColor: '#334155' },
  timelineItemCurrent: { borderWidth:1, borderColor:'#6366F1', backgroundColor:'#EEF2FF'},
  timelineText: { fontSize:13, fontWeight:'600', color:'#64748B' },
  currentAgeDot: { position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:4, backgroundColor:'#6366F1', borderWidth:1, borderColor:'#FFF'},
  categoriesSection: { marginTop: 20 },
  catCard: { width: 90, height: 90, backgroundColor:'#FFF', borderRadius:16, marginRight:10, justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#E2E8F0'},
  catTitle: { fontSize:11, fontWeight:'600', color:'#334155', marginTop:4},
  listSection: { padding: 20 },
  headerGradient: { padding: 20, borderRadius: 20, marginBottom: 16 },
  headerTitle: { color:'#FFF', fontSize:22, fontWeight:'800'},
  headerSubtitle: { color:'rgba(255,255,255,0.9)', fontSize:14},
  milestoneCard: { flexDirection:'row', alignItems:'center', backgroundColor:'#FFF', padding:16, borderRadius:16, marginBottom:10, borderWidth:1, borderColor:'#E2E8F0', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:5, elevation:2},
  mTitle: { fontSize:15, fontWeight:'700', color:'#1E293B', marginBottom:4},
  mDesc: { fontSize:13, color:'#64748B'},
  checkbox: { width:24, height:24, borderRadius:6, borderWidth:2, borderColor:'#CBD5E1', justifyContent:'center', alignItems:'center', marginLeft:12},
  emptyState: { padding: 20, alignItems:'center'},
});