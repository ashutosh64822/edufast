// Long-running server entry point for local development, Render, Railway,
// a VPS, or any host that can run `npm start` continuously.
import { createApp } from './app.js'
import { closeDb, databaseKind, initDb } from './db.js'

const PORT = process.env.PORT || 5000
const app = createApp({ serveStatic: true })

await initDb()

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ EduFast running on http://localhost:${PORT} (database: ${databaseKind}, health: /api/health)`)
})

async function shutdown() {
  server.close(async () => {
    await closeDb().catch(() => {})
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
