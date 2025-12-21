import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EARLY_QUESTIONS_DB: Record<number, any[]> = {
    1: [
        { id: 1, text: "Реагирует ли ребёнок на громкие звуки?", rec: "Стимулируйте слух: используйте погремушки с разным звуком." },
        { id: 2, text: "Смотрит ли ребёнок на лицо взрослого (20–30 см)?", rec: "Чаще устанавливайте визуальный контакт во время кормления." },
        { id: 3, text: "Удерживает ли взгляд на объекте хотя бы 2–3 сек?", rec: "Плавно перемещайте яркую игрушку перед глазами ребенка." },
        { id: 4, text: "Поднимает ли голову на несколько секунд на животе?", rec: "Выкладывайте на живот (tummy time) на 1-2 минуты несколько раз в день." },
    ],
    3: [
        { id: 1, text: "Реагирует ли ребёнок на знакомые голоса?", rec: "Чаще разговаривайте, пойте, называйте ребенка по имени." },
        { id: 2, text: "Издаёт ли ребёнок короткие звуки (гулит)?", rec: "Повторяйте звуки за ребенком, играйте в «звуковые эхо»." },
        { id: 3, text: "Поднимает ли голову и грудь, лёжа на животе?", rec: "Tummy time 3 раза в день, используйте валик под грудь для поддержки." },
        { id: 4, text: "Следит ли за предметами (вертикально/горизонтально)?", rec: "Показывайте крупные контрастные картинки или игрушки." },
        { id: 5, text: "Улыбается ли в ответ на улыбку взрослого?", rec: "Больше эмоционального взаимодействия: улыбки, смешные гримасы." },
    ],
    5: [
        { id: 1, text: "Реагирует ли ребёнок на голос взрослого?", rec: "Используйте разные интонации, читайте короткие стишки." },
        { id: 2, text: "Издаёт ли различные звуки, гулит активно?", rec: "Стимулируйте лепет, делайте паузы в речи, давая ребенку «ответить»." },
        { id: 3, text: "Поднимает ли голову и грудь на животе уверенно?", rec: "Поощряйте движения руками, кладите игрушки чуть впереди." },
        { id: 4, text: "Удерживает ли голову сидя с поддержкой?", rec: "Мягко тренируйте мышцы спины, придерживая ребенка за корпус." },
        { id: 5, text: "Держит ли руки раскрытыми, наблюдает за ними?", rec: "Вкладывайте в ладонь разные по фактуре ткани и игрушки." },
        { id: 6, text: "Пытается ли тянуться к предметам?", rec: "Размещайте дугу с игрушками на расстоянии вытянутой руки." },
        { id: 7, text: "Проявляет ли интерес к новым людям или игрушкам?", rec: "Мягко знакомьте с новыми объектами, комментируйте увиденное." },
    ],
    7: [
        { id: 1, text: "Реагирует ли ребёнок на имя?", rec: "Зовите ребенка из разных углов комнаты, меняя громкость." },
        { id: 2, text: "Издаёт ли слоги (ба, ма, да)?", rec: "Активно проговаривайте простые слоги, глядя в лицо ребенку." },
        { id: 3, text: "Переворачивается ли со спины на живот и обратно?", rec: "Стимулируйте перевороты, кладя любимую игрушку сбоку." },
        { id: 4, text: "Удерживает ли сидячее положение с поддержкой?", rec: "Развивайте баланс, слегка покачивая ребенка в положении сидя." },
        { id: 5, text: "Перекладывает ли игрушку из руки в руку?", rec: "Давайте удобные для захвата предметы (кольца, кубики)." },
    ],
    9: [
        { id: 1, text: "Реагирует ли на имя и команды (дай, иди)?", rec: "Подкрепляйте слова жестами (протянутая рука при слове «дай»)." },
        { id: 2, text: "Может ли самостоятельно сидеть без поддержки?", rec: "Обеспечьте безопасное пространство на полу для тренировки мышц." },
        { id: 3, text: "Ползает ли на животе или на четвереньках?", rec: "Создавайте «полосу препятствий» из подушек для стимуляции." },
        { id: 4, text: "Может ли поднимать мелкие предметы пальцами?", rec: "Игры с крупными пуговицами или фасолью (под строгим присмотром!)." },
        { id: 5, text: "Играет ли в «ку-ку», проявляет ли эмоции?", rec: "Играйте в прятки, стимулируйте эмоциональный отклик." },
    ],
    11: [
        { id: 1, text: "Реагирует ли на «нет», «дай», «иди»?", rec: "Используйте четкие, короткие инструкции в быту." },
        { id: 2, text: "Пытается ли обозначить предметы звуками?", rec: "Называйте всё, на что указывает ребенок, закрепляя связь." },
        { id: 3, text: "Может ли стоять с поддержкой?", rec: "Побуждайте вставать у опоры, кладя игрушки на диван." },
        { id: 4, text: "Использует ли «щипковый захват»?", rec: "Давайте ребенку кусочки безопасной еды (мягкие овощи) для захвата." },
    ],
    13: [
        { id: 1, text: "Произносит ли первые осмысленные слова?", rec: "Хвалите за любую попытку слова, повторяйте его правильно." },
        { id: 2, text: "Стоит ли самостоятельно или ходит у опоры?", rec: "Побуждайте к шагам, придерживая за обе руки, затем за одну." },
        { id: 3, text: "Бросает ли игрушки или складывает их?", rec: "Играйте в игру «положи в ведерко и высыпь»." },
    ],
    15: [
        { id: 1, text: "Понимает ли инструкции (не трогай, принеси)?", rec: "Давайте ребенку простые поручения, помогайте их выполнять." },
        { id: 2, text: "Ходит ли самостоятельно без поддержки?", rec: "Освободите пространство для первых шагов, хвалите за смелость." },
        { id: 3, text: "Проявляет ли интерес к играм с другими?", rec: "Организуйте совместные игры с другими детьми (песочница)." },
    ]
};

export default function EarlyScreeningScreen() {
    const { childId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [targetAge, setTargetAge] = useState<number>(1);
    const [answers, setAnswers] = useState<Record<number, string>>({});

    useEffect(() => {
        const getAge = async () => {
            const entries = await AsyncStorage.multiGet(['childBirthMonth', 'childBirthYear', 'extraChildren']);
            const map = Object.fromEntries(entries);
            const calculate = (m: any, y: any) => (new Date().getFullYear() - parseInt(y)) * 12 + (new Date().getMonth() + 1 - parseInt(m));
            
            let age = calculate(map.childBirthMonth || '1', map.childBirthYear || '2024');
            if (childId !== 'main' && map.extraChildren) {
                const extra = JSON.parse(map.extraChildren);
                const curr = extra.find((c: any) => c.id === childId);
                if (curr) age = calculate(curr.birthMonth, curr.birthYear);
            }
            const available = Object.keys(EARLY_QUESTIONS_DB).map(Number).sort((a, b) => a - b);
            const closest = available.reduce((p, c) => Math.abs(c - age) < Math.abs(p - age) ? c : p);
            setTargetAge(closest);
            setLoading(false);
        };
        getAge();
    }, []);

    const questions = EARLY_QUESTIONS_DB[targetAge] || EARLY_QUESTIONS_DB[1];

    const submit = async () => {
        if (Object.keys(answers).length < questions.length) return Alert.alert("Ошибка", "Ответьте на все вопросы");
        
        const res = { status: 'done', date: new Date().toISOString(), type: 'early', targetAge, answers };
        await AsyncStorage.setItem(`mchat_result_${childId}`, JSON.stringify(res));
        await AsyncStorage.setItem(`last_screening_date_${childId}`, new Date().toISOString());
        
        Alert.alert("Завершено", "Результаты сохранены", [{ text: "Ок", onPress: () => router.back() }]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#6366F1" /></View>;

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}><Ionicons name="close" size={24} color="#1E293B" /></TouchableOpacity>
                <Text style={styles.title}>Осмотр: {targetAge} мес.</Text>
                <View style={{ width: 44 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scroll}>
                {questions.map((q) => (
                    <View key={q.id} style={styles.card}>
                        <Text style={styles.qText}>{q.text}</Text>
                        <View style={styles.opts}>
                            {['green', 'yellow', 'red'].map((type) => (
                                <TouchableOpacity 
                                    key={type}
                                    onPress={() => setAnswers(prev => ({ ...prev, [q.id]: type }))}
                                    style={[styles.btn, answers[q.id] === type && (type === 'green' ? styles.bgG : type === 'yellow' ? styles.bgY : styles.bgR)]}
                                >
                                    <Text style={[styles.btnTxt, answers[q.id] === type && { color: '#FFF' }]}>
                                        {type === 'green' ? 'Да' : type === 'yellow' ? 'Иногда' : 'Нет'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
                <TouchableOpacity onPress={submit} style={styles.mainBtn}><Text style={styles.mainBtnTxt}>Сохранить</Text></TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF' },
    closeBtn: { width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '800' },
    scroll: { padding: 20 },
    card: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 2 },
    qText: { fontSize: 15, fontWeight: '700', marginBottom: 15, lineHeight: 20 },
    opts: { flexDirection: 'row', gap: 8 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
    bgG: { backgroundColor: '#10B981' }, bgY: { backgroundColor: '#F59E0B' }, bgR: { backgroundColor: '#EF4444' },
    btnTxt: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    mainBtn: { backgroundColor: '#6366F1', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 40 },
    mainBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 16 }
});