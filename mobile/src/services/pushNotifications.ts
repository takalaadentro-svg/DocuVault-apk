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

/**
 * Automatically inspects vault documents and dispatches native local notifications
 * for any document expired or expiring within 30 days.
 */
export const checkAndNotifyExpiries = async (documents: any[], forceImmediate = false): Promise<number> => {
  if (!documents || documents.length === 0) return 0;

  try {
    const saved = localStorage.getItem('docuvault_notif_prefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      if (prefs.inApp === false && prefs.pushFcm === false) {
        return 0;
      }
    }
  } catch (_) {}

  const lastCheck = sessionStorage.getItem('docuvault_last_expiry_notified');
  const now = Date.now();
  if (!forceImmediate && lastCheck && now - parseInt(lastCheck, 10) < 10 * 60 * 1000) {
    return 0;
  }

  sessionStorage.setItem('docuvault_last_expiry_notified', String(now));

  let count = 0;
  for (const doc of documents) {
    if (!doc.expiry_date) continue;
    const expTime = new Date(doc.expiry_date).getTime();
    if (isNaN(expTime)) continue;

    const daysLeft = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
    let notifTitle = '';
    let notifBody = '';

    if (daysLeft < 0) {
      notifTitle = `⚠️ Critical: "${doc.title}" is EXPIRED`;
      notifBody = `Expired on ${doc.expiry_date} (${Math.abs(daysLeft)} days ago). Immediate renewal required.`;
    } else if (daysLeft === 0) {
      notifTitle = `🚨 Urgent: "${doc.title}" expires TODAY`;
      notifBody = `Expires today (${doc.expiry_date})! Please renew immediately.`;
    } else if (daysLeft <= 7) {
      notifTitle = `⏰ Urgent Expiry: "${doc.title}" (${daysLeft} days left)`;
      notifBody = `Will expire on ${doc.expiry_date}. Please prepare renewal documents.`;
    } else if (daysLeft <= 30) {
      notifTitle = `📅 Expiry Notice: "${doc.title}" (${daysLeft} days left)`;
      notifBody = `Will expire on ${doc.expiry_date}. Check renewal requirements.`;
    }

    if (notifTitle) {
      count++;
      let id = 0;
      const str = String(doc.id || doc.title || count);
      for (let i = 0; i < str.length; i++) {
        id = ((id << 5) - id + str.charCodeAt(i)) & 0x7fffffff;
      }
      await showLocalNotification(notifTitle, notifBody, id || (1000 + count));
    }
  }

  return count;
};
