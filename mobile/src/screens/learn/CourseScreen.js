import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CourseScreen({ route }) {
  const { courseId } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Course Viewer</Text>
      <Text style={styles.text}>Viewing course ID: {courseId || 'N/A'}</Text>
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
