import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ModalScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal screen</Text>
      <Text>Здесь можно потом сделать настройки / инфо и т.д.</Text>
    </View>
  );
};

export default ModalScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
});
