import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MentorsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Mentors</Text>
      <Text style={styles.subtitle}>Connect with experienced industry leaders.</Text>
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
