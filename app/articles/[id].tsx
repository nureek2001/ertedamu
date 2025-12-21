import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Импортируем базу данных из основного файла статей
// Убедитесь, что путь верный (в прошлом сообщении был ../articles)
import { ARTICLES_DATA } from '../(tabs)/articles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ArticleDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [isFavorite, setIsFavorite] = useState(false);

    // Находим нужную статью по ID
    const article = ARTICLES_DATA.find(item => item.id === id);

    if (!article) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
                <Text style={styles.errorText}>Статья не найдена</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Вернуться назад</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Прочитай полезную статью: ${article.title}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {/* --- ВЕРХНЯЯ КАРТИНКА --- */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: article.image }} style={styles.mainImage} />
                    <LinearGradient 
                        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.1)']} 
                        style={styles.imageOverlay} 
                    />
                    
                    {/* Кнопки управления поверх картинки */}
                    <SafeAreaView style={styles.headerActions} edges={['top']}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.roundBtn}>
                            <Ionicons name="arrow-back" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={handleShare} style={[styles.roundBtn, { marginRight: 10 }]}>
                                <Ionicons name="share-outline" size={24} color="#1E293B" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)} style={styles.roundBtn}>
                                <Ionicons 
                                    name={isFavorite ? "heart" : "heart-outline"} 
                                    size={24} 
                                    color={isFavorite ? "#EF4444" : "#1E293B"} 
                                />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>

                {/* --- КОНТЕНТ СТАТЬИ --- */}
                <View style={styles.contentCard}>
                    <View style={[styles.tagBadge, { backgroundColor: article.color + '20' }]}>
                        <Text style={[styles.tagText, { color: article.color }]}>{article.tag}</Text>
                    </View>
                    
                    <Text style={styles.title}>{article.title}</Text>
                    
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={16} color="#94A3B8" />
                            <Text style={styles.metaText}>{article.readTime} на чтение</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                            <Text style={[styles.metaText, { color: '#10B981' }]}>Проверено врачом</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Текст статьи */}
                    <Text style={styles.bodyText}>
                        {article.content}
                        {"\n\n"}
                        <Text style={styles.disclaimer}>
                            Важно помнить, что каждый ребенок развивается индивидуально. Информация в данной статье носит ознакомительный характер. Перед принятием важных решений обязательно проконсультируйтесь с вашим педиатром.
                        </Text>
                        {"\n\n"}
                        <Text style={styles.bulletTitle}>Основные моменты:</Text>
                        {"\n"}• Режим дня — основа здоровья
                        {"\n"}• Питание должно быть сбалансированным
                        {"\n"}• Игровой формат — лучший способ обучения
                    </Text>

                    {/* Блок автора */}
                    <View style={styles.authorBox}>
                        <Image 
                            source={{ uri: 'https://img.freepik.com/free-photo/female-doctor-hospital-with-stethoscope_23-2148827772.jpg' }} 
                            style={styles.authorImg} 
                        />
                        <View>
                            <Text style={styles.authorName}>Др. Анна Светлова</Text>
                            <Text style={styles.authorTitle}>Педиатр, эксперт по развитию</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Кнопка записи внизу (Sticky) */}
            <SafeAreaView edges={['bottom']} style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.consultBtn, { backgroundColor: article.color || '#6366F1' }]}
                    onPress={() => router.push('/consult')}
                >
                    <Ionicons name="chatbubbles-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.consultBtnText}>Обсудить с врачом</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    errorText: { fontSize: 18, color: '#64748B', marginTop: 16, fontWeight: '600' },
    backBtn: { marginTop: 20, padding: 12, backgroundColor: '#6366F1', borderRadius: 12 },
    backBtnText: { color: '#FFF', fontWeight: '700' },
    
    imageContainer: { height: 400, width: '100%' },
    mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    imageOverlay: { ...StyleSheet.absoluteFillObject },
    
    headerActions: { 
        position: 'absolute', 
        left: 20, 
        right: 20, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    roundBtn: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: 'rgba(255,255,255,0.95)', 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5
    },

    contentCard: { 
        flex: 1, 
        backgroundColor: '#FFF', 
        marginTop: -40, 
        borderTopLeftRadius: 40, 
        borderTopRightRadius: 40, 
        padding: 24,
        paddingBottom: 120 // место для плавающей кнопки
    },
    tagBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 16 },
    tagText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    title: { fontSize: 28, fontWeight: '900', color: '#1E293B', lineHeight: 36, marginBottom: 16 },
    
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    metaText: { fontSize: 13, color: '#94A3B8', marginLeft: 6, fontWeight: '700' },
    
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 },
    
    bodyText: { fontSize: 17, color: '#334155', lineHeight: 28, fontWeight: '400' },
    disclaimer: { fontSize: 14, color: '#94A3B8', fontStyle: 'italic' },
    bulletTitle: { fontWeight: '800', color: '#1E293B', fontSize: 18 },
    
    authorBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC', 
        padding: 20, 
        borderRadius: 24, 
        marginTop: 40,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    authorImg: { width: 56, height: 56, borderRadius: 28, marginRight: 16 },
    authorName: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
    authorTitle: { fontSize: 13, color: '#94A3B8', fontWeight: '600', marginTop: 2 },

    footer: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        backgroundColor: 'rgba(255,255,255,0.9)', 
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    consultBtn: { 
        height: 60, 
        borderRadius: 20, 
        flexDirection: 'row',
        justifyContent: 'center', 
        alignItems: 'center',
        elevation: 8,
        shadowColor: "#6366F1",
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 }
    },
    consultBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});

export default ArticleDetailScreen;