import { useEffect, useState } from 'react'

const KEY = 'darkroom_lang'
const LOCALES = ['zh', 'en', 'ja']

function detect() {
  if (typeof navigator === 'undefined') return 'zh'
  const lang = (navigator.language || '').toLowerCase()
  if (lang.startsWith('ja')) return 'ja'
  if (lang.startsWith('zh')) return 'zh'
  return 'en'
}

// Shared across the /photographer pages: reads a stored preference, falls
// back to browser language on first visit, persists on change.
export function useLocale() {
  const [locale, setLocaleState] = useState('zh')

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY)
    setLocaleState(LOCALES.includes(stored) ? stored : detect())
  }, [])

  const setLocale = next => {
    setLocaleState(next)
    window.localStorage.setItem(KEY, next)
  }

  return [locale, setLocale]
}
