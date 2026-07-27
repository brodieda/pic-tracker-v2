import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initTheme } from './lib/theme'
import { applyTeamColors } from './lib/teamColors'
import { getEvent } from './lib/store'

// Apply stored theme + size + team colours before first paint to avoid a flash
initTheme()
applyTeamColors(getEvent())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
