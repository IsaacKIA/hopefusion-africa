import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChatScreen({ route }) {
  const { threadId } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversation</Text>
      <Text style={styles.text}>Chat Thread: {threadId || 'N/A'}</Text>
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
  text: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 8,
  },
});
