// app/(tabs)/articles.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, logoutRequest } from '@/lib/api';
import AppHeader, { ChildChip } from '../../components/common/AppHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const formatAgeLabel = (months: number): string => {
  if (months <= 0) return 'Малыш';
  if (months < 12) return `${months} мес.`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} лет`;
  return `${years} г. ${remainingMonths} мес.`;
};

const calculateAgeInMonths = (mStr?: string | null, yStr?: string | null): number => {
  const m = mStr ? parseInt(mStr) : 0;
  const y = yStr ? parseInt(yStr) : 0;
  if (!m || !y) return 1;
  const now = new Date();
  let age = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return age < 1 ? 1 : age;
};

// --- BACKEND TYPES ---
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

type Article = {
  id: number;
  title: string;
  category: 'health' | 'psych' | 'edu' | 'food';
  tag: string;
  read_time: string;
  image: string;
  color: string;
  min_months: number;
  max_months: number;
  content: string;
};

const CATEGORIES = [
  { id: 'all', title: 'Все', icon: 'list' },
  { id: 'health', title: 'Здоровье', icon: 'fitness' },
  { id: 'psych', title: 'Психология', icon: 'heart' },
  { id: 'edu', title: 'Развитие', icon: 'school' },
  { id: 'food', title: 'Питание', icon: 'restaurant' },
];

const ArticlesScreen = () => {
  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [childrenRes, activeRes] = await Promise.all([
        api.get<Child[]>('/api/families/children/'),
        api.get<ActiveChildResponse>('/api/families/active-child/'),
      ]);

      if (!childrenRes || childrenRes.length === 0) {
        setChildrenList([]);
        setArticles([]);
        setActiveChildIndex(0);
        return;
      }

      const list: ChildChip[] = childrenRes.map((child) => ({
        id: String(child.id),
        name: child.first_name,
        tag: formatAgeLabel(child.age_months || 1),
        // @ts-ignore
        ageGroup: child.age_months < 12 ? 'baby' : 'toddler',
        color: child.is_primary ? '#3B82F6' : '#10B981',
        // @ts-ignore
        ageMonths: child.age_months || 1,
      }));

      setChildrenList(list);

      const activeBackendId = activeRes?.active_child?.id
        ? String(activeRes.active_child.id)
        : String(childrenRes[0].id);

      const foundIndex = list.findIndex((c) => c.id === activeBackendId);
      const resolvedIndex = foundIndex >= 0 ? foundIndex : 0;
      setActiveChildIndex(resolvedIndex);

      const currentChild = list[resolvedIndex] || list[0];

      let url = `/api/articles/?child_id=${currentChild.id}`;

      if (selectedCat !== 'all') {
        url += `&category=${selectedCat}`;
      }

      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const articlesRes = await api.get<Article[]>(url);
      setArticles(articlesRes || []);
    } catch (e: any) {
      console.error('ARTICLES LOAD ERROR:', e);

      if (e?.detail === 'Учетные данные не были предоставлены.') {
        router.replace('/login');
        return;
      }

      if (e?.detail === 'Семья не найдена.') {
        setChildrenList([]);
        setArticles([]);
        setActiveChildIndex(0);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCat, searchQuery]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const currentAge = childrenList[activeChildIndex]?.ageMonths || 0;

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchCategory = selectedCat === 'all' || article.category === selectedCat;
      const matchSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchAge = currentAge >= article.min_months && currentAge <= article.max_months;
      return matchCategory && matchSearch && matchAge;
    });
  }, [articles, selectedCat, searchQuery, currentAge]);

  const handleChildChange = async (index: number) => {
    const child = childrenList[index];
    if (!child) return;

    try {
      setActiveChildIndex(index);

      await api.post('/api/families/active-child/set/', {
        child_id: Number(child.id),
      });

      await loadData();
    } catch (e: any) {
      console.error('ACTIVE CHILD CHANGE ERROR:', e);
    }
  };

  const openArticle = (id: number) => {
    router.push(`/articles/${id}` as any);
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        childrenList={childrenList}
        activeChildIndex={activeChildIndex}
        onChangeChild={handleChildChange}
        onLogout={handleLogout}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              placeholder="Поиск статей..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={[styles.catBtn, selectedCat === cat.id && styles.catBtnActive]}
            >
              <Ionicons name={cat.icon as any} size={18} color={selectedCat === cat.id ? '#FFF' : '#64748B'} />
              <Text style={[styles.catText, selectedCat === cat.id && styles.catTextActive]}>{cat.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredArticles.length > 0 && !searchQuery && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>Актуально для {childrenList[activeChildIndex]?.name}</Text>
            <TouchableOpacity
              style={styles.featuredCard}
              activeOpacity={0.9}
              onPress={() => openArticle(filteredArticles[0].id)}
            >
              <Image source={{ uri: filteredArticles[0].image }} style={styles.featuredImg} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.featuredGradient}>
                <View style={styles.featuredContent}>
                  <View style={[styles.tagBadge, { backgroundColor: filteredArticles[0].color }]}>
                    <Text style={styles.tagText}>{filteredArticles[0].tag}</Text>
                  </View>
                  <Text style={styles.featuredTitle}>{filteredArticles[0].title}</Text>
                  <View style={styles.row}>
                    <Ionicons name="time-outline" size={14} color="#FFF" />
                    <Text style={styles.featuredMeta}>{filteredArticles[0].read_time}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Полезные материалы</Text>
          {loading ? (
            <ActivityIndicator color="#6366F1" size="large" />
          ) : filteredArticles.length > 0 ? (
            filteredArticles.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.articleCard}
                activeOpacity={0.8}
                onPress={() => openArticle(item.id)}
              >
                <Image source={{ uri: item.image }} style={styles.articleImg} />
                <View style={styles.articleInfo}>
                  <Text style={[styles.articleTag, { color: item.color }]}>{item.tag}</Text>
                  <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.articleMeta}>
                    <Ionicons name="book-outline" size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>{item.read_time}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>Для этого возраста статей пока нет</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ArticlesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 40 },
  searchContainer: { paddingHorizontal: 24, marginTop: 15 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 15, height: 50, borderRadius: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '600' },
  catScroll: { paddingHorizontal: 24, marginTop: 20, paddingBottom: 10 },
  catBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 15, marginRight: 12, elevation: 1 },
  catBtnActive: { backgroundColor: '#6366F1' },
  catText: { marginLeft: 8, fontSize: 14, fontWeight: '800', color: '#64748B' },
  catTextActive: { color: '#FFF' },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: '#1E293B', marginHorizontal: 24, marginBottom: 16, marginTop: 15 },
  featuredSection: { marginTop: 10 },
  featuredCard: { marginHorizontal: 24, height: 240, borderRadius: 30, overflow: 'hidden', elevation: 8 },
  featuredImg: { width: '100%', height: '100%' },
  featuredGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '80%', justifyContent: 'flex-end', padding: 24 },
  featuredContent: {},
  tagBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 10 },
  tagText: { color: '#FFF', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  featuredTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', lineHeight: 28 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  featuredMeta: { color: '#E2E8F0', fontSize: 12, marginLeft: 6, fontWeight: '700' },
  listSection: { marginTop: 30 },
  articleCard: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 24, marginBottom: 18, borderRadius: 24, padding: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05 },
  articleImg: { width: 90, height: 90, borderRadius: 18 },
  articleInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  articleTag: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 5 },
  articleTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', lineHeight: 22 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  metaText: { fontSize: 12, color: '#94A3B8', marginLeft: 6, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94A3B8', marginTop: 15, fontSize: 15, fontWeight: '700' }
});