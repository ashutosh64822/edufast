// Vercel serverless entry point. Vercel serves the Vite build as static
// files and sends /api/* requests to this Express app.
import { createApp } from '../server/app.js'

export const config = {
  maxDuration: 30,
}

export default createApp({ serveStatic: false })
