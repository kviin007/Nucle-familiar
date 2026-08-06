import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Exponential backoff WebSocket reconnection manager for Vite HMR
function setupHmrWebSocketReconnect() {
  if (!import.meta.hot) return;

  let attempt = 0;
  let isReconnecting = false;
  const maxAttempts = 12;
  const baseDelayMs = 1000;
  const maxDelayMs = 30000;

  const attemptReconnect = () => {
    if (isReconnecting || attempt >= maxAttempts) return;
    isReconnecting = true;

    // Calculate backoff delay with exponential scaling and small jitter
    const delay = Math.min(
      baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 500),
      maxDelayMs
    );
    attempt++;

    setTimeout(() => {
      isReconnecting = false;
      try {
        if (import.meta.hot) {
          // Send ping to nudge hot client reconnect
          import.meta.hot.send('vite:ping');
        }
      } catch {
        attemptReconnect();
      }
    }, delay);
  };

  import.meta.hot.on('vite:ws:disconnect', () => {
    attemptReconnect();
  });

  import.meta.hot.on('vite:ws:connect', () => {
    attempt = 0;
    isReconnecting = false;
  });

  import.meta.hot.on('vite:error', () => {
    attemptReconnect();
  });
}

// Error interception distinguishing non-critical HMR disconnects from critical runtime errors
if (typeof window !== 'undefined') {
  const isNonCriticalHmrError = (err: any): boolean => {
    const msg = String(err?.message || err?.reason || err || '').toLowerCase();
    return (
      msg.includes('websocket') ||
      msg.includes('ws') ||
      msg.includes('hmr') ||
      msg.includes('failed to connect') ||
      msg.includes('cerrado') ||
      msg.includes('closed') ||
      msg.includes('vite:ws')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isNonCriticalHmrError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    } else {
      console.error('CRITICAL [Unhandled Rejection]:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    if (isNonCriticalHmrError(event.message) || isNonCriticalHmrError(event.error)) {
      event.preventDefault();
      event.stopPropagation();
    } else {
      console.error('CRITICAL [Runtime Error]:', event.error || event.message);
    }
  });

  setupHmrWebSocketReconnect();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
