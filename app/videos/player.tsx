import { ResizeMode, Video } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

function normalizeParam(p?: string | string[]) {
  if (!p) return undefined;
  return Array.isArray(p) ? p[0] : p;
}

function extractYouTubeId(url?: string) {
  if (!url) return null;

  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (short?.[1]) return short[1];

  const v = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (v?.[1]) return v[1];

  const emb = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (emb?.[1]) return emb[1];

  return null;
}

function isMp4(url?: string) {
  if (!url) return false;
  return /\.(mp4|m4v|mov)(\?.*)?$/i.test(url);
}

export default function VideoPlayer() {
  const params = useLocalSearchParams<{ url?: string | string[]; title?: string | string[] }>();
  const url = normalizeParam(params.url);
  const title = normalizeParam(params.title);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const youtubeId = useMemo(() => extractYouTubeId(url), [url]);
  const mp4 = useMemo(() => isMp4(url), [url]);

  const youtubeEmbedUrl = useMemo(() => {
    if (!youtubeId) return null;
    return `https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1`;
  }, [youtubeId]);

  if (!url) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.hTitle}>Видео</Text>
          <Text style={styles.hSub}>Ссылка не передана</Text>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hTitle} numberOfLines={1}>{title ?? 'Видео'}</Text>
        <Text style={styles.hSub} numberOfLines={1}>
          {youtubeId ? 'YouTube • встроенный плеер' : mp4 ? 'MP4 • встроенный плеер' : 'Ссылка'}
        </Text>
      </View>

      <View style={styles.playerCard}>
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Загрузка...</Text>
          </View>
        )}

        {!!errorText && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Не получилось загрузить</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        {/* MP4 через expo-av */}
        {mp4 ? (
          <Video
            style={styles.player}
            source={{ uri: url }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            onLoadStart={() => { setLoading(true); setErrorText(null); }}
            onReadyForDisplay={() => setLoading(false)}
            onError={(e) => { setLoading(false); setErrorText('Ошибка MP4 плеера'); }}
          />
        ) : youtubeEmbedUrl ? (
          <WebView
            style={styles.player}
            source={{ uri: youtubeEmbedUrl }}
            javaScriptEnabled
            domStorageEnabled

            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={true}

            setSupportMultipleWindows={false}

            onLoadStart={() => { setLoading(true); setErrorText(null); }}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setErrorText('WebView не смог открыть видео'); }}

            // Android: иногда помогает от чёрного экрана
            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
            // iOS: фон
            containerStyle={{ backgroundColor: '#000' }}
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackTitle}>Формат не поддержан</Text>
            <Text style={styles.fallbackText}>
              Поддерживаем YouTube (watch/youtu.be) и mp4/mov.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.9}>
        <Text style={styles.backText}>Назад</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  hTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  hSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#64748B' },

  playerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#0B1220',
  },

  player: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
  },

  loadingOverlay: {
    position: 'absolute',
    zIndex: 10,
    elevation: 10,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { color: '#FFFFFF', fontWeight: '800' },

  errorOverlay: {
    position: 'absolute',
    zIndex: 11,
    elevation: 11,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 16,
    justifyContent: 'center',
  },
  errorTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  errorText: { color: 'rgba(255,255,255,0.9)', fontWeight: '700', lineHeight: 18 },

  fallback: { padding: 16 },
  fallbackTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  fallbackText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', lineHeight: 18 },

  backBtn: {
    marginTop: 14,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backText: { color: '#FFFFFF', fontWeight: '900' },
});
