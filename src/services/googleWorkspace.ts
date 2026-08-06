// Service layer for interacting with Google Workspace APIs (Calendar, Tasks, Forms)

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  htmlLink?: string;
  status?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

// Memory cache for access token
let cachedGoogleAccessToken: string | null = null;

export const setGoogleToken = (token: string | null) => {
  cachedGoogleAccessToken = token;
  if (token) {
    sessionStorage.setItem('google_access_token', token);
  } else {
    sessionStorage.removeItem('google_access_token');
  }
};

export const getGoogleToken = (): string | null => {
  if (cachedGoogleAccessToken) return cachedGoogleAccessToken;
  const stored = sessionStorage.getItem('google_access_token');
  if (stored) {
    cachedGoogleAccessToken = stored;
    return stored;
  }
  return null;
};

/**
 * Fetch Google Calendar events for a given time range (default today)
 */
export async function fetchGoogleCalendarEvents(accessToken?: string): Promise<GoogleCalendarEvent[]> {
  const token = accessToken || getGoogleToken();
  if (!token) {
    throw new Error('No Google Access Token available');
  }

  // Calculate today bounds
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    startOfDay
  )}&timeMax=${encodeURIComponent(
    endOfDay
  )}&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Fetch Google Tasks from primary task list
 */
export async function fetchGoogleTasks(accessToken?: string): Promise<GoogleTaskItem[]> {
  const token = accessToken || getGoogleToken();
  if (!token) {
    throw new Error('No Google Access Token available');
  }

  const url = `https://www.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Tasks API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Mark a Google Task item as completed
 */
export async function completeGoogleTask(taskId: string, accessToken?: string): Promise<boolean> {
  const token = accessToken || getGoogleToken();
  if (!token) {
    throw new Error('No Google Access Token disponible');
  }

  const url = `https://www.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'completed',
      completed: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Error al completar la tarea en Google Tasks: ${response.statusText}`);
  }

  return true;
}

import { firestore, doc, setDoc, getDoc, onSnapshot } from '../lib/firebase';

/**
 * Get configured Google Form feedback URL for family suggestions
 */
export const DEFAULT_FEEDBACK_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSc_EXAMPLE_FEEDBACK_FORM/viewform?embedded=true";
const FEEDBACK_CACHE_KEY = 'family_feedback_form_url';

export function getFamilyFeedbackFormUrl(): string {
  return localStorage.getItem(FEEDBACK_CACHE_KEY) || DEFAULT_FEEDBACK_FORM;
}

export async function getFamilyFeedbackFormUrlAsync(): Promise<string> {
  if (!firestore) return getFamilyFeedbackFormUrl();
  try {
    const docRef = doc(firestore, "configuracion_global", "feedback_form");
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.url) {
      const url = snap.data().url.trim();
      localStorage.setItem(FEEDBACK_CACHE_KEY, url);
      return url;
    }
  } catch (e) {
    console.warn("Error leyendo feedback form URL de Firestore:", e);
  }
  return getFamilyFeedbackFormUrl();
}

export async function setFamilyFeedbackFormUrl(url: string): Promise<void> {
  const trimmedUrl = url.trim();
  localStorage.setItem(FEEDBACK_CACHE_KEY, trimmedUrl);

  if (firestore) {
    try {
      const docRef = doc(firestore, "configuracion_global", "feedback_form");
      await setDoc(docRef, {
        url: trimmedUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error guardando feedback form URL en Firestore:", e);
      throw e;
    }
  }
}

export function subscribeFamilyFeedbackFormUrl(callback: (url: string) => void): () => void {
  if (!firestore) {
    callback(getFamilyFeedbackFormUrl());
    return () => {};
  }

  const docRef = doc(firestore, "configuracion_global", "feedback_form");
  return onSnapshot(docRef, (snap) => {
    if (snap.exists() && snap.data()?.url) {
      const url = snap.data().url.trim();
      localStorage.setItem(FEEDBACK_CACHE_KEY, url);
      callback(url);
    } else {
      callback(getFamilyFeedbackFormUrl());
    }
  }, (err) => {
    console.warn("Aviso suscripción feedback form URL:", err);
    callback(getFamilyFeedbackFormUrl());
  });
}
