import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>
      {user && (
        <View style={styles.profileBox}>
          <Text style={styles.text}>Name: {user.first_name} {user.last_name}</Text>
          <Text style={styles.text}>Email: {user.email}</Text>
          <Text style={styles.text}>Role: {user.role}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
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
    marginBottom: 24,
  },
  profileBox: {
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#E02020',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
