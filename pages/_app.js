import '../styles/globals.css'
import 'antd/dist/antd.css';
import { DarkModeProvider } from '../contexts/DarkModeContext'

function MyApp({ Component, pageProps }) {
  return (
    <DarkModeProvider>
      <Component {...pageProps} />
    </DarkModeProvider>
  )
}

export default MyApp
