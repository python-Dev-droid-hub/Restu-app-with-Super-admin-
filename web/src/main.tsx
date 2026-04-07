import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@restaurant-app/shared'
import { LanguageProvider } from './context/LanguageContext.tsx'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import appTheme from './theme'
import './index.css'
import App from './App.tsx'

const resolveSharedApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (!envUrl) return;
  (window as any).REACT_APP_API_URL = envUrl.replace(/\/$/, '');
}

resolveSharedApiUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
