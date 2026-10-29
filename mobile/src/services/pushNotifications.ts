import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { api } from './api';

export const EXPIRY_CHANNEL_ID = 'docuvault_expiry_alerts';
const CACHED_DOCS_KEY = 'docuvault_cached_expiry_docs';
const LAST_LONG_SCHEDULE_SIG_KEY = 'docuvault_last_alarm_sig';

let initialized = false;
let isAppInForeground = true;
let lastHeartbeatUpdateMs = 0;

type NotificationTapHandler = (data: { documentId?: string; type?: string }) => void;
let notificationTapListeners: NotificationTapHandler[] = [];

export const onNotificationTapped = (handler: NotificationTapHandler) => {
  notificationTapListeners.push(handler);
  return () => {
    notificationTapListeners = notificationTapListeners.filter(h => h !== handler);
  };
};

const notifyTapListeners = (data: { documentId?: string; type?: string }) => {
  for (const listener of notificationTapListeners) {
    try {
      listener(data);
    } catch (e) {
      console.warn('Notification tap listener error:', e);
    }
  }
};

/**
 * Generates a deterministic positive 31-bit integer ID from a string key.
 */
const hashToNotificationId = (key: string, minRange: number, span: number): number => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0x7fffffff;
  }
  return minRange + (hash % span);
};

/**
 * Builds notification title & body for a document as of a target timestamp.
 */
const buildExpiryAlertCopy = (
  docTitle: string,
  expiryDateStr: string,
  targetTimeMs: number
): { title: string; body: string; daysLeft: number } | null => {
  const expTime = new Date(expiryDateStr).getTime();
  if (isNaN(expTime)) return null;

  const daysLeft = Math.ceil((expTime - targetTimeMs) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      title: `⚠️ Critical: "${docTitle}" is EXPIRED`,
      body: `Expired on ${expiryDateStr} (${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago). Immediate renewal required.`,
      daysLeft,
    };
  }
  if (daysLeft === 0) {
    return {
      title: `🚨 Urgent: "${docTitle}" expires TODAY`,
      body: `Expires today (${expiryDateStr})! Please renew immediately.`,
      daysLeft,
    };
  }
  if (daysLeft <= 7) {
    return {
      title: `⏰ Urgent Expiry: "${docTitle}" (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`,
      body: `Will expire on ${expiryDateStr}. Please prepare renewal documents.`,
      daysLeft,
    };
  }
  if (daysLeft <= 30) {
    return {
      title: `📅 Expiry Notice: "${docTitle}" (${daysLeft} days left)`,
      body: `Will expire on ${expiryDateStr}. Check renewal requirements.`,
      daysLeft,
    };
  }
  if (daysLeft <= 90) {
    return {
      title: `🔔 Advance Expiry Notice: "${docTitle}" (${daysLeft} days left)`,
      body: `Advance reminder: "${docTitle}" will expire on ${expiryDateStr}.`,
      daysLeft,
    };
  }

  return null;
};

/**
 * Checks if user has explicitly disabled all notifications in preferences.
 */
const areNotificationsEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem('docuvault_notif_prefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      if (prefs.inApp === false && prefs.pushFcm === false) {
        return false;
      }
    }
  } catch (_) {}
  return true;
};

/**
 * Reads cached expiry documents from localStorage for background scheduling.
 */
const getCachedExpiryDocs = (): Array<{ id: string; title: string; expiry_date: string }> => {
  try {
    const raw = localStorage.getItem(CACHED_DOCS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

/**
 * Saves minimal document expiry metadata to localStorage so background transitions
 * can schedule exact OS alarms without waiting for network calls.
 */
const saveCachedExpiryDocs = (documents: any[]): Array<{ id: string; title: string; expiry_date: string }> => {
  const valid = (documents || [])
    .filter(d => d && d.expiry_date && !isNaN(new Date(d.expiry_date).getTime()))
    .map(d => ({
      id: String(d.id || d.title),
      title: String(d.title || 'Document'),
      expiry_date: String(d.expiry_date),
    }));
  try {
    localStorage.setItem(CACHED_DOCS_KEY, JSON.stringify(valid));
  } catch (_) {}
  return valid;
};

/**
 * Arms immediate short-term off-app alarms (IDs 600001..600020) so that when the app
 * is closed, minimized, or swiped away, Android's AlarmManager fires the expiry notification
 * while the app is off.
 *
 * - While the app is open in the foreground, this window is pushed forward (+40s) so it does not
 *   interrupt the user while actively browsing, but is already registered in Android AlarmManager
 *   in case the user force-closes/swipes away the app.
 * - The moment the app moves to the background (!isActive), the alarm is set for +15s and +2m
 *   so the user receives the notification while the app is off.
 */
export const armOffAppHeartbeatAlarms = async (delaySeconds = 40) => {
  if (!Capacitor.isNativePlatform() || !areNotificationsEnabled()) return;

  const docs = getCachedExpiryDocs();
  if (docs.length === 0) return;

  const now = Date.now();
  const urgentDocs = docs
    .map(doc => {
      const expTime = new Date(doc.expiry_date).getTime();
      const daysLeft = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
      return { ...doc, daysLeft };
    })
    .filter(d => d.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  if (urgentDocs.length === 0) return;

  try {
    // Cancel previous quick-heartbeat IDs (600001..600020)
    const idsToCancel = Array.from({ length: 20 }, (_, i) => ({ id: 600001 + i }));
    await LocalNotifications.cancel({ notifications: idsToCancel }).catch(() => {});

    const notifications: LocalNotificationSchema[] = [];
    let slot = 0;

    for (const doc of urgentDocs) {
      // Primary off-app notification after app closes (e.g. +15s on background, +40s heartbeat)
      const fireAt1 = new Date(now + delaySeconds * 1000);
      const copy1 = buildExpiryAlertCopy(doc.title, doc.expiry_date, fireAt1.getTime());
      if (copy1 && slot < 20) {
        slot++;
        notifications.push({
          id: 600000 + slot,
          title: copy1.title,
          body: copy1.body,
          channelId: EXPIRY_CHANNEL_ID,
          smallIcon: 'ic_launcher',
          iconColor: '#0D9488',
          schedule: { at: fireAt1, allowWhileIdle: true },
          extra: { documentId: doc.id, type: 'EXPIRY_ALERT' },
        });
      }

      // Secondary follow-up off-app notification (+3 minutes after closing)
      const fireAt2 = new Date(now + 180 * 1000);
      const copy2 = buildExpiryAlertCopy(doc.title, doc.expiry_date, fireAt2.getTime());
      if (copy2 && slot < 20) {
        slot++;
        notifications.push({
          id: 600000 + slot,
          title: copy2.title,
          body: copy2.body,
          channelId: EXPIRY_CHANNEL_ID,
          smallIcon: 'ic_launcher',
          iconColor: '#0D9488',
          schedule: { at: fireAt2, allowWhileIdle: true },
          extra: { documentId: doc.id, type: 'EXPIRY_ALERT' },
        });
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (e) {
    console.warn('Could not arm off-app heartbeat alarms:', e);
  }
};

/**
 * Schedules comprehensive OS-level Android AlarmManager notifications (`allowWhileIdle: true`)
 * so the user receives document expiry alerts while the app is completely closed / off:
 * 1. Periodic background checkpoints (+15m, +1h, +4h, +12h) for expired & expiring (<=30d) docs
 * 2. Daily morning (9:00 AM) and evening (6:00 PM) reminders for the next 14 days
 * 3. Exact milestone date reminders (90, 60, 30, 14, 7, 3, 2, 1, 0 days before expiry at 9:00 AM)
 */
export const scheduleOffAppExpiryAlarms = async (documents: any[], forceReschedule = false) => {
  if (!Capacitor.isNativePlatform()) return;

  const validDocs = saveCachedExpiryDocs(documents);
  if (!areNotificationsEnabled() || validDocs.length === 0) {
    return;
  }

  // Always refresh the short-term off-app heartbeat window (throttled to every 10s in foreground)
  const now = Date.now();
  if (forceReschedule || now - lastHeartbeatUpdateMs > 10000) {
    lastHeartbeatUpdateMs = now;
    await armOffAppHeartbeatAlarms(isAppInForeground ? 40 : 15);
  }

  // Check if long-term schedule signature changed to avoid redundant heavy re-scheduling every 12s
  const currentDayKey = new Date().toISOString().slice(0, 13); // hourly bucket
  const sig = `${currentDayKey}::` + validDocs.map(d => `${d.id}:${d.expiry_date}`).sort().join('|');
  const lastSig = sessionStorage.getItem(LAST_LONG_SCHEDULE_SIG_KEY);
  if (!forceReschedule && lastSig === sig) {
    return;
  }
  sessionStorage.setItem(LAST_LONG_SCHEDULE_SIG_KEY, sig);

  try {
    // Cancel previously scheduled long-term background alarms (IDs 200000..599999)
    const pending = await LocalNotifications.getPending();
    if (pending && Array.isArray(pending.notifications)) {
      const toCancel = pending.notifications
        .filter(n => n.id >= 200000 && n.id < 600000)
        .map(n => ({ id: n.id }));
      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
      }
    }

    const notificationsToSchedule: LocalNotificationSchema[] = [];
    const usedIds = new Set<number>();

    const addScheduledNotification = (
      idKey: string,
      minId: number,
      doc: { id: string; title: string; expiry_date: string },
      fireDate: Date
    ) => {
      if (notificationsToSchedule.length >= 60) return;
      const targetMs = fireDate.getTime();
      if (targetMs <= now + 5000) return;

      const copy = buildExpiryAlertCopy(doc.title, doc.expiry_date, targetMs);
      if (!copy) return;

      let id = hashToNotificationId(idKey, minId, 90000);
      while (usedIds.has(id)) {
        id++;
      }
      usedIds.add(id);

      notificationsToSchedule.push({
        id,
        title: copy.title,
        body: copy.body,
        channelId: EXPIRY_CHANNEL_ID,
        smallIcon: 'ic_launcher',
        iconColor: '#0D9488',
        schedule: {
          at: fireDate,
          allowWhileIdle: true,
        },
        extra: {
          documentId: doc.id,
          type: 'EXPIRY_ALERT',
        },
      });
    };

    // Sort documents so expired and soonest-to-expire get priority
    const sortedDocs = [...validDocs].sort(
      (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
    );

    // 1. Sub-day background checkpoints (+15m, +1h, +4h, +12h) for docs expired or expiring <= 30 days
    const subDayOffsetsMinutes = [15, 60, 240, 720];
    for (const doc of sortedDocs) {
      const expTime = new Date(doc.expiry_date).getTime();
      const daysLeftNow = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
      if (daysLeftNow <= 30) {
        for (const mins of subDayOffsetsMinutes) {
          const fireDate = new Date(now + mins * 60 * 1000);
          addScheduledNotification(`subday_${doc.id}_${mins}`, 500000, doc, fireDate);
        }
      }
    }

    // 2. Daily 9:00 AM and 6:00 PM local time reminders for the next 14 days
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      for (const hour of [9, 18]) {
        const fireDate = new Date(now);
        fireDate.setDate(fireDate.getDate() + dayOffset);
        fireDate.setHours(hour, 0, 0, 0);
        if (fireDate.getTime() <= now + 60 * 1000) continue;

        for (const doc of sortedDocs) {
          const expTime = new Date(doc.expiry_date).getTime();
          const daysLeftAtFire = Math.ceil((expTime - fireDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeftAtFire <= 30) {
            addScheduledNotification(`daily_${doc.id}_d${dayOffset}_h${hour}`, 200000, doc, fireDate);
          }
        }
      }
    }

    // 3. Exact milestone dates (90, 60, 30, 14, 7, 3, 2, 1, 0 days before expiry at 9:00 AM)
    const milestones = [90, 60, 30, 14, 7, 3, 2, 1, 0];
    for (const doc of sortedDocs) {
      const expDate = new Date(doc.expiry_date);
      if (isNaN(expDate.getTime())) continue;

      for (const mDays of milestones) {
        const milestoneDate = new Date(expDate.getTime());
        milestoneDate.setDate(milestoneDate.getDate() - mDays);
        milestoneDate.setHours(9, 0, 0, 0);
        if (milestoneDate.getTime() > now + 60 * 1000) {
          addScheduledNotification(`milestone_${doc.id}_${mDays}d`, 350000, doc, milestoneDate);
        }
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      console.log(`Scheduled ${notificationsToSchedule.length} off-app background expiry alarms`);
    }
  } catch (e) {
    console.warn('Failed to schedule off-app expiry alarms:', e);
  }
};

export const initializePushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (initialized) return;

  try {
    // 1. Request Local Notification permissions for system tray & lock screen alerts
    const localPerm = await LocalNotifications.checkPermissions();
    if (localPerm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // 2. Create High-Importance Android Notification Channel for off-app alerts
    try {
      await LocalNotifications.createChannel({
        id: EXPIRY_CHANNEL_ID,
        name: 'Document Expiry & Critical Alerts',
        description: 'Background alerts for expired and expiring documents even when DocuVault is closed',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#0D9488',
      });
    } catch (channelErr) {
      console.warn('Channel creation warning:', channelErr);
    }

    // 3. Listen for Local Notification taps (when user taps expiry alert while app was off)
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const extra = action?.notification?.extra || {};
      notifyTapListeners({
        documentId: extra.documentId,
        type: extra.type || 'EXPIRY_ALERT',
      });
    });

    // 4. Listen for App Background / Foreground state transitions
    await CapApp.addListener('appStateChange', async ({ isActive }) => {
      isAppInForeground = isActive;
      if (!isActive) {
        // User just closed/minimized the app or locked the phone:
        // Immediately arm off-app alarms (+15s, +3m, and long-term alarms)
        await armOffAppHeartbeatAlarms(15);
      } else {
        // App returned to foreground: push the off-app heartbeat alarm forward
        await armOffAppHeartbeatAlarms(40);
      }
    });

    // 5. Request Remote Push permissions (Google FCM)
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
        showLocalNotification(
          notification.title || 'DocuVault Notification',
          notification.body || '',
          undefined,
          notification.data
        );
      });

      // Handle notification tap actions
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        const data = notification?.notification?.data || {};
        notifyTapListeners({
          documentId: data.documentId,
          type: data.type || 'EXPIRY_ALERT',
        });
      });
    }

    // 6. Arm background alarms immediately from any previously cached documents
    const cached = getCachedExpiryDocs();
    if (cached.length > 0) {
      await scheduleOffAppExpiryAlarms(cached, true);
    }

    initialized = true;
    console.log('DocuVault notifications & off-app expiry alarms initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize push notifications:', error);
  }
};

/**
 * Triggers a native Android system tray notification on the phone.
 * If running in a web browser, uses the Web Notification API as a fallback.
 */
export const showLocalNotification = async (
  title: string,
  body: string,
  id?: number,
  extra?: any
) => {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: id || Math.floor(Math.random() * 100000) + 1,
            channelId: EXPIRY_CHANNEL_ID,
            schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true },
            smallIcon: 'ic_launcher',
            iconColor: '#0D9488',
            actionTypeId: '',
            extra: extra || { type: 'EXPIRY_ALERT' },
          },
        ],
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/manifest-icon-192.png' });
    }
  } catch (e) {
    console.warn('Could not post local notification:', e);
  }
};

/**
 * Automatically inspects vault documents, dispatches immediate native notifications,
 * and arms Android OS AlarmManager background alarms so notifications continue
 * to arrive while the app is closed / off.
 */
export const checkAndNotifyExpiries = async (
  documents: any[],
  forceImmediate = false
): Promise<number> => {
  if (!documents || documents.length === 0) return 0;

  if (!areNotificationsEnabled()) return 0;

  // Always keep off-app OS alarms armed with the latest document expiry dates
  await scheduleOffAppExpiryAlarms(documents, forceImmediate);

  const lastCheck = sessionStorage.getItem('docuvault_last_expiry_notified');
  const now = Date.now();
  if (!forceImmediate && lastCheck && now - parseInt(lastCheck, 10) < 10 * 60 * 1000) {
    return 0;
  }

  sessionStorage.setItem('docuvault_last_expiry_notified', String(now));

  let count = 0;
  for (const doc of documents) {
    if (!doc.expiry_date) continue;
    const copy = buildExpiryAlertCopy(doc.title || 'Document', doc.expiry_date, now);
    if (copy && copy.daysLeft <= 30) {
      count++;
      const id = hashToNotificationId(String(doc.id || doc.title || count), 1000, 90000);
      await showLocalNotification(copy.title, copy.body, id, {
        documentId: doc.id,
        type: 'EXPIRY_ALERT',
      });
    }
  }

  return count;
};
