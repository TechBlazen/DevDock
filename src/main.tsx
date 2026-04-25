import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App'

// @apidevtools/swagger-parser → json-schema-ref-parser calls Buffer.isBuffer()
// to detect Node Buffer inputs. We never pass one in the browser, so a stub
// that always returns false is enough to keep the parser happy.
if (typeof (globalThis as { Buffer?: unknown }).Buffer === 'undefined') {
  (globalThis as { Buffer: unknown }).Buffer = { isBuffer: () => false }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
