import '../styles/globals.css'
// Self-hosted display faces for the photographer pages (no Google Fonts
// dependency — must stay reachable from mainland China).
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import { DarkModeProvider } from '../contexts/DarkModeContext'

function MyApp({ Component, pageProps }) {
  return (
    <DarkModeProvider>
      <Component {...pageProps} />
    </DarkModeProvider>
  )
}

export default MyApp
