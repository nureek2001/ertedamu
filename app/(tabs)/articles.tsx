import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

// --- РАСШИРЕННАЯ БАЗА СТАТЕЙ ---
export const ARTICLES_DATA = [
  // ПИТАНИЕ (food)
  {
    id: '1',
    title: 'Первый прикорм: пошаговое руководство для мам',
    category: 'food', tag: 'Питание', readTime: '7 мин',
    image: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=500',
    color: '#F59E0B', minMonths: 4, maxMonths: 12,
    content: 'Когда малышу исполняется 4-6 месяцев, грудного молока или смеси становится недостаточно. Вводить прикорм нужно постепенно, начиная с однокомпонентных овощных пюре (кабачок, брокколи). Не заставляйте ребенка есть, если он отказывается — знакомство с едой должно быть в радость.'
  },
  {
    id: '2',
    title: 'Витамины для роста: что должно быть в рационе',
    category: 'food', tag: 'Питание', readTime: '5 мин',
    image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=500',
    color: '#F59E0B', minMonths: 12, maxMonths: 72,
    content: 'Для активного роста ребенку необходимы кальций, железо и витамин D. Включайте в рацион творог, рыбу и свежую зелень. Помните, что лучший способ привить любовь к здоровой еде — это личный пример родителей.'
  },

  // ПСИХОЛОГИЯ (psych)
  {
    id: '3',
    title: 'Как расшифровать плач новорожденного?',
    category: 'psych', tag: 'Психология', readTime: '5 мин',
    image: 'https://images.unsplash.com/photo-1544123156-f99a2c32ee5b?q=80&w=500',
    color: '#EC4899', minMonths: 0, maxMonths: 8,
    content: 'Плач — это первый язык ребенка. Голодный плач обычно настойчивый и ритмичный. Если малыш плачет от боли, звук более резкий и пронзительный. Со временем вы начнете интуитивно различать эти сигналы.'
  },
  {
    id: '4',
    title: 'Кризис 3 лет: спокойствие, только спокойствие',
    category: 'psych', tag: 'Психология', readTime: '10 мин',
    image: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=500',
    color: '#EC4899', minMonths: 24, maxMonths: 48,
    content: 'Знаменитое "Я сам!" и частые истерики — это признаки взросления. Ребенок учится осознавать свои границы. Не подавляйте волю ребенка, давайте ему возможность выбора в простых вещах: какую футболку надеть или из какой тарелки есть.'
  },

  // РАЗВИТИЕ (edu)
  {
    id: '5',
    title: 'Сенсорные игры: развиваем моторику с рождения',
    category: 'edu', tag: 'Развитие', readTime: '6 мин',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=500',
    color: '#6366F1', minMonths: 0, maxMonths: 24,
    content: 'Развитие мелкой моторики напрямую связано с развитием речи. Давайте малышу трогать разные текстуры: гладкий шелк, шершавую бумагу, мягкий мех. После года отлично помогают игры с крупами и кинетическим песком.'
  },
  {
    id: '6',
    title: 'Подготовка к школе: на что обратить внимание',
    category: 'edu', tag: 'Развитие', readTime: '12 мин',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=500',
    color: '#6366F1', minMonths: 48, maxMonths: 84,
    content: 'Готовность к школе — это не только умение читать и считать. Гораздо важнее психологическая зрелость: умение концентрироваться, следовать правилам и общаться со сверстниками. Больше играйте в настольные игры — они учат ждать своей очереди и проигрывать без слез.'
  },

  // ЗДОРОВЬЕ (health)
  {
    id: '7',
    title: 'Закаливание: как начать и не навредить',
    category: 'health', tag: 'Здоровье', readTime: '8 мин',
    image: 'https://рндтува.рф/wp-content/uploads/2024/04/RM9NtA3jtuE-600x450.jpg',
    color: '#10B981', minMonths: 6, maxMonths: 72,
    content: 'Начинайте с воздушных ванн. Постепенно снижайте температуру воды при купании на 1 градус в неделю. Главное правило — регулярность и положительный настрой ребенка.'
  },
  {
    id: '8',
    title: 'Здоровый сон: создаем идеальные условия',
    category: 'health', tag: 'Здоровье', readTime: '6 мин',
    image: 'https://bmcudp.kz/upload/iblock/701/701d5a2ffdabadf140c0ab8557ef12c8.jpg',
    color: '#10B981', minMonths: 0, maxMonths: 36,
    content: 'Температура в комнате должна быть 18-22 градуса. Важен ритуал отхода ко сну: купание, чтение книги, тихая музыка. Это помогает нервной системе ребенка переключиться в режим отдыха.'
  }
];

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

  const loadData = useCallback(async () => {
    try {
      const entries = await AsyncStorage.multiGet(['childName', 'childBirthMonth', 'childBirthYear', 'extraChildren', 'activeChildIndex']);
      const map = Object.fromEntries(entries.map(([k, v]) => [k, v]));
      let activeIdx = map.activeChildIndex ? parseInt(map.activeChildIndex) : 0;

      const mainMonths = calculateAgeInMonths(map.childBirthMonth, map.childBirthYear);
      const list: ChildChip[] = [{
          id: 'main', name: map.childName || 'Ребёнок', tag: formatAgeLabel(mainMonths),
          // @ts-ignore
          ageGroup: mainMonths < 12 ? 'baby' : 'toddler', color: '#3B82F6',
          // @ts-ignore
          ageMonths: mainMonths,
      }];

      if (map.extraChildren) {
        try {
          const ex = JSON.parse(map.extraChildren);
          if (Array.isArray(ex)) {
            ex.forEach((c: any) => {
              const age = calculateAgeInMonths(c.birthMonth, c.birthYear);
              list.push({
                id: c.id, name: c.name, tag: formatAgeLabel(age),
                // @ts-ignore
                ageGroup: age < 12 ? 'baby' : 'toddler', color: '#10B981',
                // @ts-ignore
                ageMonths: age,
              });
            });
          }
        } catch (e) {}
      }
      setChildrenList(list);
      setActiveChildIndex(activeIdx);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const currentAge = childrenList[activeChildIndex]?.ageMonths || 0;

  const filteredArticles = ARTICLES_DATA.filter(article => {
    const matchCategory = selectedCat === 'all' || article.category === selectedCat;
    const matchSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchAge = currentAge >= article.minMonths && currentAge <= article.maxMonths;
    return matchCategory && matchSearch && matchAge;
  });

  const handleChildChange = async (index: number) => {
    setActiveChildIndex(index);
    await AsyncStorage.setItem('activeChildIndex', index.toString());
  };

  const openArticle = (id: string) => {
    router.push(`/articles/${id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader childrenList={childrenList} activeChildIndex={activeChildIndex} onChangeChild={handleChildChange} onLogout={() => router.replace('/login')} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- ПОИСК --- */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput placeholder="Поиск статей..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        </View>

        {/* --- КАТЕГОРИИ --- */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} onPress={() => setSelectedCat(cat.id)} style={[styles.catBtn, selectedCat === cat.id && styles.catBtnActive]}>
              <Ionicons name={cat.icon as any} size={18} color={selectedCat === cat.id ? '#FFF' : '#64748B'} />
              <Text style={[styles.catText, selectedCat === cat.id && styles.catTextActive]}>{cat.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* --- ГЛАВНАЯ СТАТЬЯ --- */}
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
                    <Text style={styles.featuredMeta}>{filteredArticles[0].readTime}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* --- СПИСОК СТАТЕЙ --- */}
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
                    <Text style={styles.metaText}>{item.readTime}</Text>
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