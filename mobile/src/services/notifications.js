import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('hopefusion', {
      name:         'HopeFusion Africa',
      importance:   Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:   '#2DB562',
      sound:        true,
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  })).data;

  // Register token with backend
  try {
    await api.post('/push/register', { token, platform: Platform.OS });
  } catch (err) {
    console.error('Failed to register push token:', err);
  }

  return token;
}

export function setupNotificationHandlers(navigation) {
  // Handle notification tap while app is in background/closed
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    switch (data?.type) {
      case 'new_match':
        navigation.navigate('Matches');
        break;
      case 'message':
        navigation.navigate('Messages');
        break;
      case 'grant_deadline':
        navigation.navigate('Grants');
        break;
      case 'session_reminder':
        navigation.navigate('Dashboard');
        break;
      default:
        navigation.navigate('Notifications');
    }
  });
  return () => sub.remove();
}
