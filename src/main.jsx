import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Classroom (Tailwind) base loads first so its preflight sits below the school's
// unlayered styles.css — which App.jsx imports — keeping both zones intact.
import './classroom/classroom.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
