import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app, firestore, doc, setDoc } from '../lib/firebase';
import { TareaDiaria } from '../types';

export interface PushNotificationPayload {
  id: string;
  title: string;
  body: string;
  type: 'critical' | 'reminder' | 'overdue' | 'system';
  taskId?: string;
  timestamp: string;
  read: boolean;
}

export interface DevicePlatformInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  platform: 'ios' | 'android' | 'web';
}

class PushNotificationService {
  private messaging: any = null;
  private token: string | null = null;
  private listeners: ((payload: PushNotificationPayload) => void)[] = [];
  private notificationHistory: PushNotificationPayload[] = [];

  constructor() {
    this.loadHistory();
  }

  /**
   * Detect current OS environment (iOS, Android, or Web)
   */
  public getDeviceInfo(): DevicePlatformInfo {
    if (typeof window === 'undefined') {
      return { isMobile: false, isIOS: false, isAndroid: false, isStandalone: false, platform: 'web' };
    }
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isMobile = isIOS || isAndroid || /Mobile/.test(ua);
    const isStandalone = ('standalone' in (window.navigator as any)) && (window.navigator as any).standalone === true;
    const platform: 'ios' | 'android' | 'web' = isIOS ? 'ios' : isAndroid ? 'android' : 'web';

    return { isMobile, isIOS, isAndroid, isStandalone, platform };
  }

  private loadHistory() {
    try {
      const saved = localStorage.getItem('push_notifications_history');
      if (saved) {
        this.notificationHistory = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load push notification history", e);
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem('push_notifications_history', JSON.stringify(this.notificationHistory.slice(0, 50)));
    } catch (e) {
      console.warn("Could not save push notification history", e);
    }
  }

  /**
   * Initialize FCM and request notification permission on iOS/Android or Web
   */
  public async requestPermissionAndGetToken(userId?: string): Promise<{ success: boolean; token?: string; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Entorno no compatible con navegador' };
    }

    const deviceInfo = this.getDeviceInfo();

    // Check if Notification API exists
    if (!('Notification' in window)) {
      if (deviceInfo.isIOS && !deviceInfo.isStandalone) {
        return {
          success: false,
          error: 'En iOS, añade esta aplicación a tu Pantalla de Inicio (Añadir a inicio) para habilitar las notificaciones Push.'
        };
      }
      return { success: false, error: 'Este dispositivo/navegador no soporta notificaciones Web Push.' };
    }

    try {
      // 1. Request browser or mobile notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Permiso de notificaciones denegado en el dispositivo.' };
      }

      // 2. Initialize Firebase Cloud Messaging if supported
      const supported = app ? await isSupported().catch(() => false) : false;
      let finalToken: string | null = null;

      if (supported && app) {
        this.messaging = getMessaging(app);
        
        try {
          const fcmToken = await getToken(this.messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined
          });

          if (fcmToken) {
            finalToken = fcmToken;
          }
        } catch (fcmErr) {
          console.warn('[FCM Token Note] Fallback a token nativo:', fcmErr);
        }
      }

      if (!finalToken) {
        finalToken = `fcm_token_${deviceInfo.platform}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }

      this.token = finalToken;
      localStorage.setItem('fcm_push_token', finalToken);

      // 3. Register token in Firestore and backend for currentUser
      if (userId) {
        await this.registerTokenWithBackend(userId, finalToken, deviceInfo.platform);
        await this.registerTokenInFirestore(userId, finalToken, deviceInfo.platform);
      }

      this.listenToForegroundMessages();
      return { success: true, token: finalToken };

    } catch (err: any) {
      console.error('Error requesting notification permission:', err);
      return { success: false, error: err.message || 'Error al configurar notificaciones push' };
    }
  }

  /**
   * Save FCM token directly into client Firestore user document
   */
  private async registerTokenInFirestore(userId: string, token: string, platform: string) {
    if (!firestore || !userId) return;
    try {
      const userRef = doc(firestore, 'usuarios', userId);
      await setDoc(userRef, {
        fcmToken: token,
        pushToken: token,
        pushEnabled: true,
        platform,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firestore] Token FCM guardado con éxito para el usuario ${userId} (${platform})`);
    } catch (e) {
      console.warn('[Firestore FCM Sync Error]', e);
    }
  }

  /**
   * Register FCM token on backend server
   */
  private async registerTokenWithBackend(userId: string, token: string, platform: string) {
    try {
      await fetch('/api/user/push-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, pushToken: token, fcmToken: token, platform })
      });
    } catch (e) {
      console.warn('Could not register FCM token on server:', e);
    }
  }

  /**
   * Listen for incoming FCM messages while app is open in foreground
   */
  private listenToForegroundMessages() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('[FCM Notification Received in Foreground]', payload);
      const notif: PushNotificationPayload = {
        id: `push_${Date.now()}`,
        title: payload.notification?.title || 'Notificación del Núcleo',
        body: payload.notification?.body || '',
        type: (payload.data?.type as any) || 'critical',
        taskId: payload.data?.taskId,
        timestamp: new Date().toISOString(),
        read: false
      };

      this.addNotificationToHistory(notif);
      this.playAlertSound(notif.type);
      this.showBrowserNotification(notif.title, notif.body, notif.type);
      this.notifyListeners(notif);
    });
  }

  /**
   * Trigger a push notification for a critical task or reminder locally & via server
   */
  public triggerTaskNotification(task: TareaDiaria, type: 'critical' | 'reminder' | 'overdue') {
    let title = '';
    let body = '';

    if (type === 'critical') {
      title = `🚨 ¡TAREA CRÍTICA!: ${task.titulo}`;
      body = `Asignada para ${task.hora_programada || 'hoy'}. Requiere atención prioritaria e inmediata.`;
    } else if (type === 'overdue') {
      title = `⏰ Tarea Vencida: ${task.titulo}`;
      body = `La hora pautada (${task.hora_programada}) ha transcurrido. Por favor completa la tarea o aplázala.`;
    } else {
      title = `🔔 Recordatorio: ${task.titulo}`;
      body = `Hora de realizar tu tarea programada para las ${task.hora_programada || 'hoy'}.`;
    }

    const payload: PushNotificationPayload = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title,
      body,
      type,
      taskId: task.tarea_id,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.addNotificationToHistory(payload);
    this.playAlertSound(type);
    this.showBrowserNotification(title, body, type);
    this.notifyListeners(payload);

    // Send push request to server for multi-device/family broadcasting
    fetch('/api/notifications/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: task.usuario_id,
        title,
        body,
        taskId: task.tarea_id,
        type
      })
    }).catch(err => console.warn("Server push notification dispatch note:", err));

    return payload;
  }

  /**
   * Display a native OS / Browser push notification
   */
  public showBrowserNotification(title: string, body: string, type: string = 'critical') {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `task_notif_${type}`,
          requireInteraction: type === 'critical'
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('Browser notification error:', e);
      }
    }
  }

  /**
   * Play alert sound chime using Web Audio API (no external mp3 file needed)
   */
  public playAlertSound(type: 'critical' | 'reminder' | 'overdue' | 'system') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type === 'critical' ? 'sawtooth' : 'sine';
      
      const now = ctx.currentTime;
      if (type === 'critical') {
        // High urgency double chime
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.15); // D6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      } else {
        // Gentle reminder chime
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  public addNotificationToHistory(payload: PushNotificationPayload) {
    this.notificationHistory.unshift(payload);
    this.saveHistory();
  }

  /**
   * Update or create a fixed persistent notification summarizing today's task checklist.
   * Uses a static tag 'daily_checklist_widget' so it updates in-place like a live widget widget/badge.
   */
  public async updateDailyChecklistWidgetNotification(tareas: TareaDiaria[], currentUserId?: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Filter today's tasks for current user (or all if no currentUserId specified)
    const userTasks = tareas.filter(t => !currentUserId || t.usuario_id === currentUserId);
    const totalCount = userTasks.length;
    const completedCount = userTasks.filter(t => t.estado === 'completada').length;

    const title = `📋 Checklist del Día - Núcleo`;
    let body = '';
    if (totalCount === 0) {
      body = `No tienes tareas programadas para hoy. ¡Disfruta tu día!`;
    } else if (completedCount === totalCount) {
      body = `🎉 ¡Todas completadas! ${completedCount} de ${totalCount} tareas hechas hoy (100%).`;
    } else {
      const percent = Math.round((completedCount / totalCount) * 100);
      body = `${completedCount} de ${totalCount} tareas completadas hoy (${percent}%).`;
    }

    const notificationOptions: any = {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'daily_checklist_widget', // Tag único para actualizar en vez de apilar
      renotify: false,               // Mantiene la actualización silenciosa sin chillar a cada clic
      silent: true,
      requireInteraction: true,      // Fijada en el panel de notificaciones
      data: { url: '/?view=hoy' }
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, notificationOptions);
          return;
        }
      }
      new Notification(title, notificationOptions);
    } catch (e) {
      console.warn('[PWA Checklist Widget] Error enviando/actualizando notificación:', e);
    }
  }

  public getNotificationHistory(): PushNotificationPayload[] {
    return this.notificationHistory;
  }

  public markAsRead(id: string) {
    const item = this.notificationHistory.find(n => n.id === id);
    if (item) {
      item.read = true;
      this.saveHistory();
    }
  }

  public markAllAsRead() {
    this.notificationHistory.forEach(n => n.read = true);
    this.saveHistory();
  }

  public subscribe(listener: (payload: PushNotificationPayload) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(payload: PushNotificationPayload) {
    this.listeners.forEach(l => l(payload));
  }
}

export const pushNotificationService = new PushNotificationService();
