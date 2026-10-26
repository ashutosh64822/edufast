// Netlify Function entry point. netlify.toml rewrites /api/* to this
// function; server/app.js also mounts the router at
// /.netlify/functions/api so the original Express route names keep working.
import serverless from 'serverless-http'
import { createApp } from '../../server/app.js'

export const handler = serverless(createApp({ serveStatic: false }))
