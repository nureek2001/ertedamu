import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AppHeader, { ChildChip } from '../../components/common/AppHeader';
import { CompletedActivity, getChildProgress, getMilestonesProgress } from '../../utils/storage';
import { ACTIVITY_LIBRARY, ActivityCategory, CATEGORY_META } from '../activities/data';
import { MILESTONE_LIBRARY, MILESTONE_META, MilestoneCategory } from '../milestones/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- КОНСТАНТЫ И ДАННЫЕ ---

const MONTHLY_REMINDERS: Record<number, { title: string, items: string[] }> = {
    0: { title: "0 месяц", items: ["Осмотр неонатолога и педиатра", "Скрининг слуха, пульсоксиметрия, тест на гипотиреоз", "Вакцинации: BCG, HepB (0)"] },
    1: { title: "1 месяц", items: ["Визит к педиатру", "Осмотры: невролог, ортопед, хирург", "Контроль веса, рефлексов, тонуса"] },
    2: { title: "2 месяца", items: ["Плановый приём у педиатра", "Вакцины: Pentaxim (1 доза), PCV13 (1), Rota (1)"] },
    3: { title: "3 месяца", items: ["Осмотр у педиатра", "Контроль общего развития"] },
    4: { title: "4 месяца", items: ["Визит к педиатру", "Оценка развития, переводов взгляда", "Вакцины: Pentaxim (2), PCV13 (2), Rota (2)"] },
    5: { title: "5 месяцев", items: ["Плановый приём у педиатра", "Контроль моторики (перевороты)"] },
    6: { title: "6 месяцев", items: ["Визит к педиатру + невролог", "Осмотр офтальмолога", "Вакцины: Pentaxim (3), HepB (3), OPV (1)"] },
    7: { title: "7 месяцев", items: ["Осмотр у педиатра", "Контроль навыков: сидение, реакция на имя"] },
    8: { title: "8 месяцев", items: ["Визит к педиатру", "Проверка ползания и захвата предметов"] },
    9: { title: "9 месяцев", items: ["Осмотр у педиатра и невролога", "Скрининг развития: моторика, понимание речи"] },
    10: { title: "10 месяцев", items: ["Визит к педиатру", "Оценка: вставание у опоры, игра 'ладушки'"] },
    11: { title: "11 месяцев", items: ["Осмотр у педиатра", "Проверка мелкой моторики и лепета"] },
    12: { title: "12 месяцев (1 год)", items: ["Годовой осмотр (педиатр, невролог, офтальмолог, ортопед, стоматолог)", "Скрининг: ходьба, первые слова, жесты", "Вакцины: КПК, HepA (1)"] },
};

const MCHAT_RECOMMENDATIONS = {
    low: { title: "Всё в порядке", text: "Ваш результат указывает на низкий риск. Продолжайте заниматься по программе развития.", color: "#166534", bg: "#DCFCE7", icon: "checkmark-done-circle" },
    medium: { title: "Требуется внимание", text: "Средний риск. Рекомендуется обсудить результаты с вашим педиатром.", color: "#92400E", bg: "#FEF3C7", icon: "alert-circle" },
    high: { title: "Рекомендуется консультация", text: "Высокий риск требует обязательной консультации специалиста (невролога).", color: "#991B1B", bg: "#FEE2E2", icon: "warning" }
};

const STAGE_TESTS: Record<number, { question: string, items: string[] }> = {
    0: { question: "Проверка новорожденного", items: ["Реагирует на громкие звуки", "Пытается фокусировать взгляд", "Успокаивается на руках"] },
    12: { question: "Достижения 1 года", items: ["Делает несколько шагов сам", "Использует простые жесты", "Говорит 'мама' или 'папа'"] },
    24: { question: "Навыки в 2 года", items: ["Фразы из двух слов", "Знает части тела", "Умеет бегать"] },
    36: { question: "Развитие в 3 года", items: ["Одевается сам", "Вопросы 'Почему?'", "Педали велосипеда"] },
    48: { question: "Навыки в 4 года", items: ["Рисует человека", "Рассказывает о дне", "Ждет очереди"] },
    60: { question: "Подготовка к школе (5 лет)", items: ["Считает до 10+", "Четко произносит звуки", "Знает свой адрес"] },
    72: { question: "Готовность к школе (6 лет)", items: ["Читает по слогам", "Пишет свое имя", "Правила в играх"] },
};

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const calculateAgeInMonths = (mStr?: string | null, yStr?: string | null): number => {
    const m = mStr ? parseInt(mStr) : 0;
    const y = yStr ? parseInt(yStr) : 0;
    if (!m || !y) return 1;
    const now = new Date();
    let age = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
    return age < 1 ? 1 : age;
};

const MyChildScreen: React.FC = () => {
      const handleLogout = async () => {
        router.replace('/login');
      };
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
    const [activeChildIndex, setActiveChildIndex] = useState(0);
    const [currentChildAge, setCurrentChildAge] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<'activities' | 'milestones'>('activities');
    const [completedActivities, setCompletedActivities] = useState<CompletedActivity[]>([]);
    const [completedMilestones, setCompletedMilestones] = useState<string[]>([]);
    const [confirmedStages, setConfirmedStages] = useState<number[]>([]);
    const [mchatStatus, setMchatStatus] = useState<any>(null);
    const [isScreeningAvailable, setIsScreeningAvailable] = useState(true);

    const [isTestVisible, setIsTestVisible] = useState(false);
    const [isHistoryVisible, setIsHistoryVisible] = useState(false); // Для календаря
    const [selectedStage, setSelectedStage] = useState<any>(null);
    const [testProgress, setTestProgress] = useState<string[]>([]);

    const loadData = useCallback(async () => {
        try {
            const entries = await AsyncStorage.multiGet(['childName', 'childBirthMonth', 'childBirthYear', 'extraChildren', 'activeChildIndex']);
            const map = Object.fromEntries(entries.map(([k, v]) => [k, v]));
            let activeIdx = map.activeChildIndex ? parseInt(map.activeChildIndex) : 0;
            setActiveChildIndex(activeIdx);

            const mainAge = calculateAgeInMonths(map.childBirthMonth, map.childBirthYear);
            const mainList: ChildChip[] = [{
                id: 'main', name: map.childName || 'Ребёнок', tag: `${mainAge} мес.`,
                ageGroup: 'unknown', ageMonths: mainAge, color: '#3B82F6',
            }];

            if (map.extraChildren) {
                try {
                    const extra = JSON.parse(map.extraChildren);
                    if (Array.isArray(extra)) {
                        extra.forEach((c) => {
                            const extraAge = calculateAgeInMonths(c.birthMonth, c.birthYear);
                            mainList.push({
                                id: c.id, name: c.name, tag: `${extraAge} мес.`,
                                ageGroup: 'unknown', ageMonths: extraAge, color: '#10B981'
                            });
                        });
                    }
                } catch (e) { }
            }
            setChildrenList(mainList);

            const currentChild = mainList[activeIdx] || mainList[0];
            const currentId = currentChild.id;

            const lastDate = await AsyncStorage.getItem(`last_screening_date_${currentId}`);
            if (lastDate) {
                const d = new Date(lastDate);
                const now = new Date();
                const alreadyDoneThisMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                setIsScreeningAvailable(!alreadyDoneThisMonth);
            } else {
                setIsScreeningAvailable(true);
            }

            const savedConfirmed = await AsyncStorage.getItem(`confirmed_stages_${currentId}`);
            setConfirmedStages(savedConfirmed ? JSON.parse(savedConfirmed) : []);

            const res = await AsyncStorage.getItem(`mchat_result_${currentId}`);
            setMchatStatus(res ? JSON.parse(res) : null);
            setCurrentChildAge(currentChild.ageMonths || 1);

            const [actProgress, milProgress] = await Promise.all([
                getChildProgress(currentId),
                getMilestonesProgress(currentId)
            ]);
            setCompletedActivities(actProgress);
            setCompletedMilestones(milProgress);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeChildIndex]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const handleChildChange = async (index: number) => {
        setActiveChildIndex(index);
        await AsyncStorage.setItem('activeChildIndex', index.toString());
    };

    const toggleTestItem = (item: string) => {
        if (selectedStage && confirmedStages.includes(selectedStage.m)) return;
        setTestProgress(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };

    const handleCompleteTest = async () => {
        const stageMonths = selectedStage.m;
        const isAlreadyConfirmed = confirmedStages.includes(stageMonths);
        if (testProgress.length === STAGE_TESTS[stageMonths].items.length) {
            if (isAlreadyConfirmed) { setIsTestVisible(false); return; }
            const currentId = childrenList[activeChildIndex].id;
            const newConfirmed = [...new Set([...confirmedStages, stageMonths])];
            await AsyncStorage.setItem(`confirmed_stages_${currentId}`, JSON.stringify(newConfirmed));
            setConfirmedStages(newConfirmed);
            Alert.alert("Поздравляем!", `Этап "${selectedStage.title}" подтвержден.`);
            setIsTestVisible(false);
        } else {
            Alert.alert("Внимание", "Отметьте все пункты.");
        }
    };

    const renderJourneyMap = () => {
        const stages = [
            { m: 0, label: '0м', title: 'Рождение', icon: 'heart', color: '#F43F5E' },
            { m: 12, label: '1г', title: 'Шаги', icon: 'walk', color: '#F59E0B' },
            { m: 24, label: '2г', title: 'Разговор', icon: 'chatbubbles', color: '#10B981' },
            { m: 36, label: '3г', title: 'Я сам!', icon: 'color-palette', color: '#3B82F6' },
            { m: 48, label: '4г', title: 'Дружба', icon: 'people', color: '#8B5CF6' },
            { m: 60, label: '5л', title: 'Творчество', icon: 'bulb', color: '#EC4899' },
            { m: 72, label: '6л', title: 'Школа', icon: 'school', color: '#6366F1' },
        ];
        return (
            <View style={styles.journeySection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Карта достижений</Text>
                    <View style={styles.totalProgressBadge}><Text style={styles.totalProgressText}>{Math.round((currentChildAge / 72) * 100)}% пути</Text></View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.journeyScroll, { paddingTop: 40 }]}>
                    {stages.map((stage, index) => {
                        const isReached = currentChildAge >= stage.m;
                        const isConfirmed = confirmedStages.includes(stage.m);
                        const isCurrent = isReached && (index === stages.length - 1 || currentChildAge < stages[index + 1].m);
                        return (
                            <View key={stage.m} style={styles.journeyNode}>
                                {index !== stages.length - 1 && (<View style={[styles.connector, { backgroundColor: currentChildAge > stage.m ? stage.color : '#E2E8F0' }]} />)}
                                <TouchableOpacity activeOpacity={0.7} onPress={() => { if (!isReached) return; setSelectedStage(stage); setTestProgress(isConfirmed ? STAGE_TESTS[stage.m].items : []); setIsTestVisible(true); }} style={[styles.nodeCircle, { backgroundColor: isReached ? stage.color : '#FFF', borderColor: isReached ? stage.color : '#E2E8F0' }, isCurrent && styles.nodeCircleCurrent, isConfirmed && styles.nodeCircleConfirmed]}>
                                    <Ionicons name={stage.icon as any} size={24} color={isReached ? '#FFF' : '#CBD5E1'} />
                                    {isConfirmed && (<View style={styles.confirmedBadge}><Ionicons name="checkmark-circle" size={18} color="#10B981" /></View>)}
                                    {isCurrent && !isConfirmed && (<View style={styles.currentIndicator}><Text style={styles.currentIndicatorText}>ВЫ ТУТ</Text></View>)}
                                </TouchableOpacity>
                                <Text style={[styles.nodeLabel, isReached && { color: '#1E293B', fontWeight: '800' }]}>{stage.label}</Text>
                                <Text style={styles.nodeTitle}>{stage.title}</Text>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderHealthReminders = () => {
        const age = Math.min(currentChildAge, 12);
        const currentReminder = MONTHLY_REMINDERS[age] || MONTHLY_REMINDERS[12];
        return (
            <View style={styles.remindersSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Медицинский календарь</Text>
                    <TouchableOpacity onPress={() => setIsHistoryVisible(true)}><Text style={styles.historyLink}>История</Text></TouchableOpacity>
                </View>
                <View style={styles.reminderCard}>
                    <View style={styles.reminderHeader}>
                        <View style={styles.bellIcon}><Ionicons name="notifications" size={20} color="#6366F1" /></View>
                        <Text style={styles.reminderMonth}>{currentReminder.title}</Text>
                    </View>
                    {currentReminder.items.map((item, idx) => (
                        <View key={idx} style={styles.reminderItem}>
                            <Ionicons name="ellipse" size={6} color="#94A3B8" style={{ marginTop: 6 }} />
                            <Text style={styles.reminderText}>{item}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const activityStats = (Object.keys(CATEGORY_META) as ActivityCategory[]).map(cat => {
        const done = completedActivities.filter(ca => ACTIVITY_LIBRARY.find(a => a.id === ca.activityId)?.category === cat).length;
        const target = ACTIVITY_LIBRARY.filter(a => a.category === cat && a.minMonths <= currentChildAge).length;
        return { key: cat, meta: CATEGORY_META[cat], percent: Math.min(Math.round((done / (target || 1)) * 100), 100) };
    });
    const totalActPercent = Math.min(Math.round((activityStats.reduce((s, i) => s + i.percent, 0) / (activityStats.length || 1))), 100);

    const milestoneStats = (Object.keys(MILESTONE_META) as MilestoneCategory[]).map(cat => {
        const target = MILESTONE_LIBRARY.filter(m => m.category === cat && m.month <= currentChildAge);
        const done = target.filter(m => completedMilestones.includes(m.id)).length;
        return { key: cat, meta: MILESTONE_META[cat], done, target: target.length, percent: Math.min(Math.round((done / (target.length || 1)) * 100), 100) };
    });
    const totalMilPercent = Math.min(Math.round((milestoneStats.reduce((s, i) => s + i.percent, 0) / (milestoneStats.length || 1))), 100);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <AppHeader childrenList={childrenList} activeChildIndex={activeChildIndex} onChangeChild={handleChildChange} onLogout={handleLogout}/>
            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
                
                {renderJourneyMap()}

                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Здоровье и тесты</Text></View>
                
                <TouchableOpacity 
                    style={[styles.riskCard, !isScreeningAvailable && styles.riskCardDisabled]} 
                    onPress={() => isScreeningAvailable ? router.push({ pathname: "/screening", params: { childId: childrenList[activeChildIndex].id } }) : Alert.alert("Тест пройден", "Скрининг можно проводить раз в месяц.")}
                >
                    <LinearGradient colors={!isScreeningAvailable ? (mchatStatus?.status === 'high' ? ['#EF4444', '#B91C1C'] : mchatStatus?.status === 'medium' ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']) : ['#6366F1', '#4F46E5']} style={styles.riskIconContainer}>
                        <Ionicons name={!isScreeningAvailable ? "stats-chart" : "shield-checkmark"} size={24} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.riskTitle}>Скрининг M-CHAT-R</Text>
                        {!isScreeningAvailable && mchatStatus ? (
                            <View>
                                <View style={styles.statusBadgeRow}>
                                    <View style={[styles.miniStatusBadge, { backgroundColor: mchatStatus.status === 'low' ? '#DCFCE7' : mchatStatus.status === 'medium' ? '#FEF3C7' : '#FEE2E2' }]}>
                                        <Text style={[styles.miniStatusText, { color: mchatStatus.status === 'low' ? '#166534' : mchatStatus.status === 'medium' ? '#92400E' : '#991B1B' }]}>{mchatStatus.status === 'low' ? 'НИЗКИЙ РИСК' : mchatStatus.status === 'medium' ? 'СРЕДНИЙ РИСК' : 'ВЫСОКИЙ РИСК'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.dateText}>Проверено: {formatDate(mchatStatus.date)}</Text>
                            </View>
                        ) : (<Text style={styles.riskSub}>Тест на риск аутизма</Text>)}
                    </View>
                    <View style={styles.lockInfo}>{!isScreeningAvailable && <Ionicons name="lock-closed" size={16} color="#94A3B8" />}<Ionicons name="chevron-forward" size={20} color="#94A3B8" style={{marginLeft: 4}} /></View>
                </TouchableOpacity>

                {/* БЛОК РЕКОМЕНДАЦИЙ */}
                {!isScreeningAvailable && mchatStatus && (
                    <View style={[styles.recommendationCard, { backgroundColor: MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].bg }]}>
                        <View style={styles.recommendationHeader}>
                            <Ionicons name={MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].icon as any} size={20} color={MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].color} />
                            <Text style={[styles.recommendationTitle, { color: MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].color }]}>Рекомендация: {MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].title}</Text>
                        </View>
                        <Text style={[styles.recommendationText, { color: MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].color }]}>{MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].text}</Text>
                        {mchatStatus.status !== 'low' && (
                            <TouchableOpacity style={[styles.actionBtn, { borderColor: MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].color }]} onPress={() => router.push('/consult')}>
                                <Text style={[styles.actionBtnText, { color: MCHAT_RECOMMENDATIONS[mchatStatus.status as keyof typeof MCHAT_RECOMMENDATIONS].color }]}>Записаться на консультацию</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* КАЛЕНДАРЬ НАПОМИНАНИЙ */}
                {renderHealthReminders()}

                <View style={styles.tabsContainer}>
                    <TouchableOpacity onPress={() => setActiveTab('activities')} style={[styles.tabButton, activeTab === 'activities' && styles.tabButtonActive]}><Text style={[styles.tabText, activeTab === 'activities' && styles.tabTextActive]}>Активности</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('milestones')} style={[styles.tabButton, activeTab === 'milestones' && styles.tabButtonActive]}><Text style={[styles.tabText, activeTab === 'milestones' && styles.tabTextActive]}>Достижения</Text></TouchableOpacity>
                </View>

                {activeTab === 'activities' ? (
                    <View style={styles.statsPage}>
                        <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.mainProgressCard}>
                            <View style={styles.progressInfo}><Text style={styles.progressValue}>{totalActPercent}%</Text><Text style={styles.progressLabel}>Развитие навыков</Text></View>
                            <Ionicons name="rocket" size={60} color="rgba(255,255,255,0.3)" />
                        </LinearGradient>
                        <View style={styles.grid}>
                            {activityStats.map((item) => (
                                <View key={item.key} style={styles.gridItem}>
                                    <View style={[styles.itemIcon, { backgroundColor: item.meta.gradient[0] + '20' }]}><Text style={{fontSize: 20}}>{item.meta.emoji}</Text></View>
                                    <Text style={styles.itemName}>{item.meta.label}</Text>
                                    <Text style={styles.itemPercent}>{item.percent}%</Text>
                                    <View style={styles.miniBar}><View style={[styles.miniBarFill, { width: `${item.percent}%`, backgroundColor: item.meta.gradient[0] }]} /></View>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.statsPage}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.mainProgressCard}>
                            <View style={styles.progressInfo}><Text style={styles.progressValue}>{totalMilPercent}%</Text><Text style={styles.progressLabel}>Освоено этапов</Text></View>
                            <Ionicons name="medal" size={60} color="rgba(255,255,255,0.3)" />
                        </LinearGradient>
                        {milestoneStats.map((item) => (
                            <View key={item.key} style={styles.milestoneRow}>
                                <View style={[styles.milestoneIcon, { backgroundColor: item.meta.color }]}><Text style={{fontSize: 18}}>{item.meta.emoji}</Text></View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.milestoneName}>{item.meta.label}</Text>
                                    <View style={styles.milestoneBar}><View style={[styles.milestoneBarFill, { width: `${item.percent}%`, backgroundColor: item.meta.color }]} /></View>
                                </View>
                                <Text style={styles.milestoneCount}>{item.done}/{item.target}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* МОДАЛЬНЫЕ ОКНА */}
            <Modal visible={isTestVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, { backgroundColor: selectedStage?.color }]}>
                            <Ionicons name={selectedStage?.icon} size={32} color="#FFF" />
                            <Text style={styles.modalHeaderText}>{selectedStage?.title}</Text>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={styles.testQuestion}>{STAGE_TESTS[selectedStage?.m]?.question}</Text>
                            {STAGE_TESTS[selectedStage?.m]?.items.map((item, idx) => (
                                <TouchableOpacity key={idx} style={styles.checkItem} onPress={() => toggleTestItem(item)}>
                                    <Ionicons name={testProgress.includes(item) ? "checkbox" : "square-outline"} size={24} color={testProgress.includes(item) ? selectedStage?.color : "#94A3B8"} />
                                    <Text style={[styles.checkText, testProgress.includes(item) && styles.checkTextActive]}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.btnCancel} onPress={() => setIsTestVisible(false)}><Text style={styles.btnCancelText}>Закрыть</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: selectedStage?.color }]} onPress={handleCompleteTest}>
                                <Text style={styles.btnConfirmText}>{confirmedStages.includes(selectedStage?.m) ? "Понятно" : "Подтвердить"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

<Modal visible={isHistoryVisible} animationType="slide" transparent={false}>
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Хедер с размытым эффектом или просто чистый дизайн */}
        <View style={styles.historyHeaderEnhanced}>
            <TouchableOpacity 
                onPress={() => setIsHistoryVisible(false)}
                style={styles.closeButtonCircle}
            >
                <Ionicons name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
            <View>
                <Text style={styles.historyMainTitle}>Медицинская карта</Text>
                <Text style={styles.historySubTitle}>План развития до 12 месяцев</Text>
            </View>
        </View>
        
        <ScrollView 
            contentContainerStyle={{ padding: 24, paddingLeft: 35 }} // Отступ слева для линии таймлайна
            showsVerticalScrollIndicator={false}
        >
            {/* Вертикальная линия таймлайна */}
            <View style={styles.timelineLine} />

            {Object.entries(MONTHLY_REMINDERS).map(([month, data]) => {
                const m = parseInt(month);
                const isPast = m < currentChildAge;
                const isCurrent = m === currentChildAge;
                
                return (
                    <View key={month} style={styles.timelineNode}>
                        {/* Точка на таймлайне */}
                        <View style={[
                            styles.timelineDot, 
                            isPast && styles.dotPast, 
                            isCurrent && styles.dotCurrent
                        ]}>
                            {isPast && <Ionicons name="checkmark" size={12} color="#FFF" />}
                        </View>

                        <View style={[
                            styles.enhancedHistoryCard,
                            isCurrent && styles.cardCurrentActive,
                            isPast && styles.cardPast
                        ]}>
                            {isCurrent && (
                                <LinearGradient 
                                    colors={['#6366F1', '#818CF8']} 
                                    start={{x:0, y:0}} end={{x:1, y:0}}
                                    style={styles.currentBadgeGradient}
                                >
                                    <Text style={styles.currentBadgeText}>ТЕКУЩИЙ ЭТАП</Text>
                                </LinearGradient>
                            )}

                            <Text style={[styles.historyCardMonth, isCurrent && {color: '#6366F1'}]}>
                                {data.title}
                            </Text>

                            <View style={styles.reminderItemsContainer}>
                                {data.items.map((it, i) => (
                                    <View key={i} style={styles.enhancedReminderRow}>
                                        <View style={[styles.miniDot, {backgroundColor: isCurrent ? '#6366F1' : '#CBD5E1'}]} />
                                        <Text style={styles.historyCardText}>{it}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    </View>
</Modal>
        </SafeAreaView>
    );
};

export default MyChildScreen;

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingBottom: 40 },
    journeySection: { marginTop: 20, marginBottom: 10 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    totalProgressBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    totalProgressText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },
    journeyScroll: { paddingHorizontal: 24, paddingBottom: 20 },
    journeyNode: { width: 100, alignItems: 'center' },
    connector: { position: 'absolute', height: 4, width: 100, top: 30, left: 50, zIndex: 0 },
    nodeCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', zIndex: 1, elevation: 4 },
    nodeCircleCurrent: { transform: [{ scale: 1.15 }], borderWidth: 4, borderColor: '#FFF' },
    nodeCircleConfirmed: { borderColor: '#10B981' },
    confirmedBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FFF', borderRadius: 10 },
    currentIndicator: { position: 'absolute', top: -35, backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    currentIndicatorText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
    nodeLabel: { marginTop: 12, fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    nodeTitle: { fontSize: 10, color: '#64748B', textAlign: 'center' },

    riskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 24, padding: 16, borderRadius: 24, elevation: 2, marginBottom: 20 },
    riskCardDisabled: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F5F9' },
    riskIconContainer: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    riskTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    riskSub: { fontSize: 12, color: '#64748B' },
    statusBadgeRow: { flexDirection: 'row', marginTop: 4 },
    miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    miniStatusText: { fontSize: 10, fontWeight: '900' },
    dateText: { fontSize: 10, color: '#94A3B8' },
    lockInfo: { flexDirection: 'row', alignItems: 'center' },

    recommendationCard: { marginHorizontal: 24, marginTop: -10, marginBottom: 24, padding: 16, borderRadius: 20, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
    recommendationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    recommendationTitle: { fontSize: 14, fontWeight: '800', marginLeft: 8 },
    recommendationText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
    actionBtn: { marginTop: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 10, borderStyle: 'dashed', alignItems: 'center' },
    actionBtnText: { fontSize: 12, fontWeight: '700' },

    remindersSection: { marginBottom: 24 },
    historyLink: { color: '#6366F1', fontWeight: '700', fontSize: 14 },
    reminderCard: { backgroundColor: '#FFF', marginHorizontal: 24, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' },
    reminderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    bellIcon: { backgroundColor: '#EEF2FF', padding: 8, borderRadius: 10, marginRight: 12 },
    reminderMonth: { fontSize: 16, fontWeight: '800' },
    reminderItem: { flexDirection: 'row', marginBottom: 8 },
    reminderText: { fontSize: 13, color: '#475569', marginLeft: 10 },

    tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', marginHorizontal: 24, borderRadius: 16, padding: 4, marginBottom: 20 },
    tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    tabButtonActive: { backgroundColor: '#FFF', elevation: 2 },
    tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    tabTextActive: { color: '#1E293B', fontWeight: '700' },

    statsPage: { paddingHorizontal: 24 },
    mainProgressCard: { borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    progressInfo: { flex: 1 },
    progressValue: { fontSize: 36, fontWeight: '900', color: '#FFF' },
    progressLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '48%', backgroundColor: '#FFF', padding: 16, borderRadius: 20, marginBottom: 16 },
    itemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    itemName: { fontSize: 13, fontWeight: '700' },
    itemPercent: { fontSize: 18, fontWeight: '800' },
    miniBar: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2 },
    miniBarFill: { height: '100%', borderRadius: 2 },

    milestoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 20, marginBottom: 12 },
    milestoneIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    milestoneName: { fontSize: 14, fontWeight: '700' },
    milestoneBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3 },
    milestoneBarFill: { height: '100%', borderRadius: 3 },
    milestoneCount: { fontSize: 14, fontWeight: '800', marginLeft: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: SCREEN_WIDTH * 0.85, backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden' },
    modalHeader: { padding: 24, alignItems: 'center' },
    modalHeaderText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
    modalBody: { padding: 24 },
    testQuestion: { fontSize: 16, fontWeight: '700', marginBottom: 20 },
    checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    checkText: { fontSize: 14, color: '#64748B', marginLeft: 12 },
    checkTextActive: { color: '#1E293B', fontWeight: '700' },
    modalFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 16 },
    btnCancel: { flex: 1, alignItems: 'center' },
    btnCancelText: { color: '#94A3B8', fontWeight: '700' },
    btnConfirm: { flex: 1.5, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    btnConfirmText: { color: '#FFF', fontWeight: '800' },

    historyHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    historyTitle: { fontSize: 18, fontWeight: '800' },
    historyCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    // --- Улучшенный дизайн истории ---
    historyHeaderEnhanced: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    closeButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    historyMainTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1E293B',
    },
    historySubTitle: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '600',
    },
    timelineLine: {
        position: 'absolute',
        left: 10,
        top: 30,
        bottom: 30,
        width: 2,
        backgroundColor: '#E2E8F0',
        zIndex: 0,
    },
    timelineNode: {
        marginBottom: 25,
        position: 'relative',
    },
    timelineDot: {
        position: 'absolute',
        left: -33,
        top: 20,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#CBD5E1',
        zIndex: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotPast: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    dotCurrent: {
        backgroundColor: '#FFF',
        borderColor: '#6366F1',
        width: 22,
        height: 22,
        left: -35,
        borderWidth: 4,
    },
    enhancedHistoryCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 18,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardCurrentActive: {
        borderColor: '#6366F1',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
    },
    cardPast: {
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    currentBadgeGradient: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 10,
    },
    currentBadgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    reminderItemsContainer: {
        marginTop: 10,
    },
    enhancedReminderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    miniDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginTop: 7,
        marginRight: 10,
    },
    historyCardMonth: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
    },
    historyCardText: {
        flex: 1,
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        fontWeight: '500',
    },
});