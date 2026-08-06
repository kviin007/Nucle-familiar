// Service for handling PWA installation prompt and Service Worker registration

let deferredPrompt: any = null;
const listeners = new Set<(canInstall: boolean) => void>();

export function initPwaInstallListener() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard automatic prompt
    e.preventDefault();
    deferredPrompt = e;
    notifyListeners(true);
    console.log('[PWA] beforeinstallprompt event captured');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners(false);
    console.log('[PWA] Application successfully installed');
  });
}

export function subscribePwaInstall(callback: (canInstall: boolean) => void): () => void {
  listeners.add(callback);
  callback(deferredPrompt !== null);
  return () => listeners.delete(callback);
}

function notifyListeners(canInstall: boolean) {
  listeners.forEach((callback) => callback(canInstall));
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('[PWA] No deferred prompt available for installation');
    return false;
  }

  deferredPrompt.prompt();
  const choiceResult = await deferredPrompt.userChoice;
  if (choiceResult.outcome === 'accepted') {
    console.log('[PWA] User accepted the install prompt');
    deferredPrompt = null;
    notifyListeners(false);
    return true;
  } else {
    console.log('[PWA] User dismissed the install prompt');
    return false;
  }
}

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] ServiceWorker registration failed:', err);
        });
    });
  } else if ('serviceWorker' in navigator) {
    // In dev mode, still attempt registration for preview testing
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW Dev] ServiceWorker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW Dev] ServiceWorker registration info:', err);
      });
  }
}
