import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ProBento from './ProBento.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProBento />
  </StrictMode>,
)
