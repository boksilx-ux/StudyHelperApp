// src/screens/SettingsScreen.js
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>설정</Text>
        <Text style={styles.desc}>여기에 앱 설정 UI가 들어갈 예정입니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7', padding: 16 },
  box: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111' },
  desc: { fontSize: 14, color: '#555' },
});
