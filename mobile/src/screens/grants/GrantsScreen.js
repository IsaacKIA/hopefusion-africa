import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GrantsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grants & Programs</Text>
      <Text style={styles.subtitle}>Discover non-dilutive funding opportunities.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 24,
  },
  title: {
    color: '#2DB562',
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
