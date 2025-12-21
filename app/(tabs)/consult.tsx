import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Импортируем ваш хедер
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

const getAgeGroupFromMonths = (m: number): any => {
  if (m < 12) return 'baby';
  if (m < 36) return 'toddler';
  return 'preschooler';
};

// --- ДАННЫЕ КАТЕГОРИЙ ---
const CATEGORIES = [
  { id: 'all', title: 'Все', icon: 'apps-outline', color: '#64748B' }, // Кнопка Все
  { id: 'pediatric', title: 'Педиатрия', icon: 'medical-outline', color: '#3B82F6' },
  { id: 'neuro', title: 'Невролог', icon: 'brain-outline', color: '#6366F1' },
  { id: 'speech', title: 'Логопед', icon: 'chatbubbles-outline', color: '#F59E0B' },
  { id: 'psych', title: 'Психолог', icon: 'heart-outline', color: '#10B981' },
  { id: 'ortho', title: 'Ортопед', icon: 'body-outline', color: '#EC4899' },
];

// --- ДАННЫЕ ДОКТОРОВ ---
const DOCTORS_DATA = [
  { id: '1', name: 'Др. Елена Соколова', specialty: 'Педиатр-невролог', catId: 'neuro', rating: '4.9', image: 'https://img.freepik.com/free-photo/doctor-with-co-workers-at-the-back_1098-1268.jpg', color: '#6366F1', minAge: 0, maxAge: 72, online: true },
  { id: '2', name: 'Др. Иван Петров', specialty: 'Детский психолог', catId: 'psych', rating: '5.0', image: 'https://img.freepik.com/free-photo/portrait-of-male-doctor-with-stethoscope-smiling_23-2148827755.jpg', color: '#10B981', minAge: 24, maxAge: 180, online: true },
  { id: '3', name: 'Др. Мария Левина', specialty: 'Логопед-дефектолог', catId: 'speech', rating: '4.8', image: 'https://img.freepik.com/free-photo/beautiful-young-female-doctor-looking-at-camera_23-2148480537.jpg', color: '#F59E0B', minAge: 18, maxAge: 72, online: false },
  { id: '4', name: 'Др. Артем Громов', specialty: 'Детский ортопед', catId: 'ortho', rating: '4.7', image: 'https://img.freepik.com/free-photo/doctor-offering-medical-assistance-to-elderly-patient_23-2148827744.jpg', color: '#EC4899', minAge: 6, maxAge: 144, online: true },
  { id: '5', name: 'Др. Анна Светлова', specialty: 'Педиатр высшей категории', catId: 'pediatric', rating: '4.9', image: 'https://img.freepik.com/free-photo/female-doctor-hospital-with-stethoscope_23-2148827772.jpg', color: '#3B82F6', minAge: 0, maxAge: 180, online: true },
  { id: '6', name: 'Др. Виктор Цой', specialty: 'Детский реабилитолог', catId: 'neuro', rating: '4.6', image: 'https://img.freepik.com/free-photo/serious-male-doctor-looking-at-camera_23-2148827750.jpg', color: '#6366F1', minAge: 12, maxAge: 120, online: false },
  { id: '7', name: 'Др. София Коваль', specialty: 'Нейропсихолог', catId: 'psych', rating: '5.0', image: 'https://img.freepik.com/free-photo/portrait-of-young-doctor-with-clipboard-and-stethoscope_23-2148827741.jpg', color: '#10B981', minAge: 36, maxAge: 180, online: true },
  { id: '8', name: 'Др. Ольга Мур', specialty: 'Логопед-фонопед', catId: 'speech', rating: '4.7', image: 'https://img.freepik.com/free-photo/doctor-waiting-for-patient-in-hospital-office_23-2148827740.jpg', color: '#F59E0B', minAge: 24, maxAge: 96, online: false },
];

const ARTICLES = [
  { id: 1, title: 'Как подготовить ребенка к консультации?', icon: 'book-outline', color: '#6366F1' },
  { id: 2, title: 'Режим дня и здоровье системы', icon: 'alarm-outline', color: '#10B981' },
];

const ConsultScreen = () => {
  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [filteredDoctors, setFilteredDoctors] = useState(DOCTORS_DATA);
  const [selectedCatId, setSelectedCatId] = useState<string>('all'); // По умолчанию "Все"
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    router.replace('/login');
  };

  const applyFilters = (age: number, catId: string) => {
    let result = DOCTORS_DATA.filter(d => age >= d.minAge && age <= d.maxAge);
    if (catId !== 'all') {
      result = result.filter(doc => doc.catId === catId);
    }
    setFilteredDoctors(result);
  };

  const handleCategoryPress = (id: string) => {
    setSelectedCatId(id);
    applyFilters(childrenList[activeChildIndex]?.ageMonths || 0, id);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await AsyncStorage.multiGet(['childName', 'childBirthMonth', 'childBirthYear', 'extraChildren', 'activeChildIndex']);
      const map = Object.fromEntries(entries.map(([k, v]) => [k, v]));
      let activeIdx = map.activeChildIndex ? parseInt(map.activeChildIndex) : 0;

      const mainMonths = calculateAgeInMonths(map.childBirthMonth, map.childBirthYear);
      const list: ChildChip[] = [
        {
          id: 'main',
          name: map.childName || 'Ребёнок',
          tag: formatAgeLabel(mainMonths),
          // @ts-ignore
          ageGroup: getAgeGroupFromMonths(mainMonths),
          color: '#3B82F6',
          // @ts-ignore
          ageMonths: mainMonths,
        },
      ];

      if (map.extraChildren) {
        try {
          const ex = JSON.parse(map.extraChildren);
          if (Array.isArray(ex)) {
            ex.forEach((c: any) => {
              const age = calculateAgeInMonths(c.birthMonth, c.birthYear);
              list.push({
                id: c.id,
                name: c.name,
                tag: formatAgeLabel(age),
                // @ts-ignore
                ageGroup: getAgeGroupFromMonths(age),
                color: '#10B981',
                // @ts-ignore
                ageMonths: age,
              });
            });
          }
        } catch (e) {}
      }
      
      setChildrenList(list);
      setActiveChildIndex(activeIdx);
      applyFilters(list[activeIdx]?.ageMonths || 0, selectedCatId);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedCatId]);

  const handleChildChange = async (index: number) => {
    setActiveChildIndex(index);
    await AsyncStorage.setItem('activeChildIndex', index.toString());
    const age = childrenList[index]?.ageMonths || 0;
    applyFilters(age, selectedCatId);
  };

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader childrenList={childrenList} activeChildIndex={activeChildIndex} onChangeChild={handleChildChange} onLogout={handleLogout} />

      {loading ? (
        <View style={styles.loaderBox}><ActivityIndicator size="large" color="#6366F1" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* --- БЛИЖАЙШИЕ ЗАПИСИ --- */}
          <View style={styles.section}>
             <Text style={styles.sectionTitle}>Ближайшие записи</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.appointmentScroll}>
                <TouchableOpacity style={styles.appointmentCard}>
                   <View style={styles.appDate}>
                      <Text style={styles.appMonth}>ДЕК</Text>
                      <Text style={styles.appDay}>24</Text>
                   </View>
                   <View style={styles.appInfo}>
                      <Text style={styles.appTime}>14:30 — Видеочат</Text>
                      <Text style={styles.appDoc}>Др. Елена Соколова</Text>
                   </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.appointmentEmpty}>
                   <Ionicons name="add" size={24} color="#6366F1" />
                   <Text style={styles.appAddText}>Новая запись</Text>
                </TouchableOpacity>
             </ScrollView>
          </View>

          {/* --- НАПРАВЛЕНИЯ --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Направления</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCatId === cat.id;
                return (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={styles.catCard} 
                    onPress={() => handleCategoryPress(cat.id)}
                  >
                    <View style={[styles.catIconBox, { backgroundColor: isSelected ? cat.color : cat.color + '15' }]}>
                      <Ionicons name={cat.icon as any} size={26} color={isSelected ? '#FFF' : cat.color} />
                    </View>
                    <Text style={[styles.catText, isSelected && { color: cat.color, fontWeight: '900' }]}>{cat.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* --- БАННЕР СРОЧНОЙ ПОМОЩИ --- */}
          <TouchableOpacity style={styles.urgentCard} activeOpacity={0.9} onPress={() => Alert.alert("Срочный вызов", "Соединяем с дежурным педиатром...")}>
            <LinearGradient colors={['#FF4D4D', '#F43F5E']} style={styles.urgentGradient}>
              <View style={{ flex: 1 }}>
                <Text style={styles.urgentTitle}>Срочный вопрос?</Text>
                <Text style={styles.urgentSub}>Дежурный педиатр ответит в течение 10-15 минут</Text>
              </View>
              <View style={styles.urgentIconCircle}>
                <Ionicons name="flash" size={24} color="#F43F5E" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* --- СПИСОК ВРАЧЕЙ --- */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Рекомендуемые врачи</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{filteredDoctors.length}</Text></View>
            </View>

            {filteredDoctors.length > 0 ? (
              filteredDoctors.map(doc => (
                <TouchableOpacity key={doc.id} style={styles.doctorCard}>
                  <View>
                    <Image source={{ uri: doc.image }} style={styles.docImg} />
                    {doc.online && <View style={styles.onlineBadge} />}
                  </View>
                  <View style={styles.docMain}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.docSpec}>{doc.specialty}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.ratingLabel}>{doc.rating}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.chatAction, { backgroundColor: doc.color }]}>
                    <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>В данной категории врачи не найдены для этого возраста</Text>
              </View>
            )}
          </View>

          {/* --- СОВЕТЫ ВРАЧЕЙ --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Советы и статьи</Text>
            {ARTICLES.map(art => (
              <TouchableOpacity key={art.id} style={styles.articleItem}>
                <View style={[styles.artIcon, { backgroundColor: art.color + '10' }]}>
                  <Ionicons name={art.icon as any} size={20} color={art.color} />
                </View>
                <Text style={styles.artTitle}>{art.title}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>

          {/* --- КАК ЭТО РАБОТАЕТ --- */}
          <View style={styles.howItWorks}>
            <Text style={styles.howTitle}>Помощь для {childrenList[activeChildIndex]?.name}</Text>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepText}>Выберите врача из списка или категорию</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepText}>Опишите проблему и симптомы в чате</Text>
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 40 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', paddingHorizontal: 24, marginBottom: 12 },
  badge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: -10, marginBottom: 12 },
  badgeText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },
  
  appointmentScroll: { paddingLeft: 24, paddingRight: 10 },
  appointmentCard: { width: SCREEN_WIDTH * 0.7, backgroundColor: '#6366F1', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  appDate: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 50 },
  appMonth: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  appDay: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  appInfo: { marginLeft: 15 },
  appTime: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  appDoc: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 2 },
  appointmentEmpty: { width: 120, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 24 },
  appAddText: { color: '#6366F1', fontSize: 12, fontWeight: '700', marginTop: 5 },

  catScroll: { paddingLeft: 24, paddingRight: 10 },
  catCard: { alignItems: 'center', marginRight: 20 },
  catIconBox: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  catText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  urgentCard: { paddingHorizontal: 24, marginTop: 25 },
  urgentGradient: { padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center' },
  urgentTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  urgentSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, fontWeight: '600' },
  urgentIconCircle: { width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  doctorCard: { backgroundColor: '#FFF', marginHorizontal: 24, padding: 15, borderRadius: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  docImg: { width: 70, height: 70, borderRadius: 20 },
  onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#FFF' },
  docMain: { flex: 1, marginLeft: 15 },
  docName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  docSpec: { fontSize: 13, color: '#64748B', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ratingLabel: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginLeft: 4 },
  chatAction: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  articleItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 24, padding: 12, borderRadius: 16, marginBottom: 10 },
  artIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  artTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#475569' },

  howItWorks: { margin: 24, padding: 24, backgroundColor: '#F1F5F9', borderRadius: 28 },
  howTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 15 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  stepText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 10 }
});

export default ConsultScreen;