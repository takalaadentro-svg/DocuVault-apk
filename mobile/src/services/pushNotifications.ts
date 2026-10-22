import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { api } from './api';

let initialized = false;

export const initializePushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (initialized) return;

  try {
    // 1. Request Local Notification permissions for system tray alerts
    const localPerm = await LocalNotifications.checkPermissions();
    if (localPerm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // 2. Request Remote Push permissions (Google FCM)
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === 'granted') {
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
        // Show local system tray notification when in foreground
        showLocalNotification(
          notification.title || 'DocuVault Notification',
          notification.body || ''
        );
      });

      // Handle notification tap actions
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification tapped:', notification.notification.title);
      });
    }

    initialized = true;
    console.log('DocuVault notifications initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize push notifications:', error);
  }
};

/**
 * Triggers a native Android system tray notification on the phone.
 * If running in a web browser, uses the Web Notification API as a fallback.
 */
export const showLocalNotification = async (title: string, body: string, id?: number) => {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: id || Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'beep.wav',
            smallIcon: 'ic_launcher',
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/manifest-icon-192.png' });
    }
  } catch (e) {
    console.warn('Could not post local notification:', e);
  }
};
