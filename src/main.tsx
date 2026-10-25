import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './ui/App.tsx'
import '@fontsource/black-ops-one/latin-400.css'
import '@fontsource/cinzel/latin-600.css'
import '@fontsource/pirata-one/latin-400.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
