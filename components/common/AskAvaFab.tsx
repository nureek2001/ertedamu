// components/AskAvaFab.tsx
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AskAvaFabProps = {
  onPress: () => void;
  /** насколько поднять кнопку от низа (чтобы не залезала на tab-bar) */
  bottomInset?: number;
};

const AskAvaFab: React.FC<AskAvaFabProps> = ({ onPress, bottomInset = 22 }) => {
  return (
    <View pointerEvents="box-none" style={styles.fabLayer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.fabWrap, { bottom: bottomInset }]}
      >
        {/* плашка "Ask Ava" */}
        <View style={styles.fabGlass}>
          <View style={styles.fabDot} />
          <Text style={styles.fabLabel}>Ask Erte Damu AI</Text>
          <Text style={styles.fabHint}>AI • советы • развитие</Text>
        </View>

        {/* круглая кнопка */}
        <LinearGradient
          colors={['#6366F1', '#EC4899']}
          style={styles.fabCircle}
        >
          <Text style={styles.fabIcon}>✦</Text>
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>AI</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default AskAvaFab;

const styles = StyleSheet.create({
  fabLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    pointerEvents: 'box-none',
  },
  fabWrap: {
    position: 'absolute',
    right: 16,
    // bottom задаём через проп bottomInset
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },

  fabGlass: {
    height: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  fabDot: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  fabLabel: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  fabHint: {
    marginLeft: 10,
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  fabCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 16,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  fabBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
