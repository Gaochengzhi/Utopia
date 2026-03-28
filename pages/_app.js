import '../styles/globals.css'
import { DarkModeProvider } from '../contexts/DarkModeContext'

function MyApp({ Component, pageProps }) {
  return (
    <DarkModeProvider>
      <Component {...pageProps} />
    </DarkModeProvider>
  )
}

export default MyApp
