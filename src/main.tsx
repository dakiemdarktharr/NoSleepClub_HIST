import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import './tour/tour.css';
import { LocaleProvider } from './i18n';
createRoot(document.getElementById('root')!).render(<LocaleProvider><App /></LocaleProvider>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/offline-guide.js').catch(() => { /* The online guide and session remain usable when offline storage is unavailable. */ }); });
}
