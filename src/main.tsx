import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add global event listeners to suppress benign HMR WebSocket errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason?.message || event.reason?.toString() || '';
    if (
      reasonStr.includes('WebSocket') || 
      reasonStr.includes('websocket') || 
      reasonStr.includes('HMR')
    ) {
      event.preventDefault();
      console.warn('Benign WebSocket/HMR rejection suppressed:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || '';
    if (
      errorMsg.includes('WebSocket') || 
      errorMsg.includes('websocket') ||
      errorMsg.includes('HMR')
    ) {
      event.preventDefault();
      console.warn('Benign WebSocket/HMR error suppressed:', errorMsg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
