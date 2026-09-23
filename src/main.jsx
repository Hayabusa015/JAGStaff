import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Classroom (Tailwind) base loads first so its preflight sits below the school's
// unlayered styles.css — which App.jsx imports — keeping both zones intact.
import './classroom/classroom.css'
import App from './App.jsx'
import ParentConferences from './components/ParentConferences.jsx'

// /conferences is the one public (no sign-in) page: parents booking
// parent-teacher conferences. Everything else is the signed-in portal.
const isConferencePage = /^\/conferences\/?$/.test(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isConferencePage ? <ParentConferences /> : <App />}
  </StrictMode>,
)
