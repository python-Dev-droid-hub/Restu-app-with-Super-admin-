import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@restaurant-app/shared'
import './index.css'
import App from './App.tsx'

// Set API base URL for shared package (Vite uses import.meta.env)
if (import.meta.env.VITE_API_URL) {
  (window as any).REACT_APP_API_URL = import.meta.env.VITE_API_URL;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
