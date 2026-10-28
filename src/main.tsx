import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
import { LocaleProvider } from './i18n';
createRoot(document.getElementById('root')!).render(<LocaleProvider><App /></LocaleProvider>);
