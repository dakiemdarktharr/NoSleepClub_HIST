import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { LOCALES, languageNames, translate, type Locale, type MessageKey, type Params } from './catalog';
import { localizeMessage } from './runtime';
const fontLoads = {
  en: () => Promise.resolve(),
  ko: () => import('./ko.css'), zh: () => import('./zh.css'),
  ja: () => import('./ja.css'), ru: () => import('./ru.css'),
};
function remembered(): Locale {
  try { const value = localStorage.getItem('hist-locale-v1'); return LOCALES.includes(value as Locale) ? value as Locale : 'en'; } catch { return 'en'; }
}
const Context = createContext<{
  locale: Locale; setLocale: (value: Locale) => void;
  t: (key: MessageKey, params?: Params) => string; m: (text: string) => string;
}>({ locale: 'en', setLocale: () => {}, t: key => translate(key, 'en'), m: text => localizeMessage(text, 'en') });
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, update] = useState<Locale>(remembered);
  useEffect(() => {
    document.documentElement.lang = languageNames[locale].intl;
    document.documentElement.dataset.locale = locale;
    document.title = `NoSleepClub · ${translate('city', locale)}`;
    void fontLoads[locale]();
  }, [locale]);
  const setLocale = (value: Locale) => { update(value); try { localStorage.setItem('hist-locale-v1', value); } catch { /* Private browsing remains usable. */ } };
  return <Context.Provider value={{ locale, setLocale, t: (key, params) => translate(key, locale, params), m: text => localizeMessage(text, locale) }}>{children}</Context.Provider>;
}
export const useLocale = () => useContext(Context);
export function LanguageChoices({ onChoose }: { onChoose?: () => void }) {
  const { locale, setLocale } = useLocale();
  return <div className="language-choices">{LOCALES.map(value => <button key={value} lang={languageNames[value].intl} className={`language-choice language-${value}`} aria-pressed={locale === value} onClick={() => { setLocale(value); onChoose?.(); }}><span>{languageNames[value].native}</span><small lang="en">{languageNames[value].english}</small><span aria-hidden="true">↗</span></button>)}</div>;
}
export function LanguageGate({ onChoose }: { onChoose: () => void }) {
  return <main className="language-screen"><div className="language-masthead">NoSleepClub <span>Ho Chi Minh City</span></div><section><p className="language-kicker">WELCOME · 환영합니다 · 欢迎 · ようこそ · ДОБРО ПОЖАЛОВАТЬ</p><h1>Choose your<br/><em>language.</em></h1><LanguageChoices onChoose={onChoose}/></section><div className="language-rule" aria-hidden="true"/></main>;
}
