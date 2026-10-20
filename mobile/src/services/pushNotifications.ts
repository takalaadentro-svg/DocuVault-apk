import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { api } from './api';

let initialized = false;

export const initializePushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (initialized) return;

  try {
    // Request permission from the user
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission not granted.');
      return;
    }

    // Register with Google FCM to receive device token
    await PushNotifications.register();

    // On success, sync device token with backend
    await PushNotifications.addListener('registration', async (token) => {
      console.log('FCM Device Registration Token received:', token.value);
      await api.updateFcmToken(token.value);
    });

    // Handle registration errors
    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('FCM Registration error:', err.error);
    });

    // Handle foreground notifications
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Foreground push notification received:', notification.title, notification.body);
    });

    // Handle notification tap actions
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification tapped:', notification.notification.title);
    });

    initialized = true;
    console.log('FCM Push Notification listeners active');
  } catch (error) {
    console.warn('Failed to initialize push notifications:', error);
  }
};
