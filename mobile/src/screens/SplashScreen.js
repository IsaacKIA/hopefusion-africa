import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>HopeFusion Africa</Text>
      <Text style={styles.subtitle}>Ecosystem Operating System</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  title: {
    color: '#2DB562',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 8,
  },
});
