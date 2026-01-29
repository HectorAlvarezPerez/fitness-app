import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

// For Workers Sites, we need to import the manifest
// @ts-ignore
import manifest from '__STATIC_CONTENT_MANIFEST'

const app = new Hono()

// Serve static files
app.use('/*', serveStatic({ root: './', manifest }))

// Fallback to index.html for SPA routing
app.get('*', serveStatic({ path: './index.html', manifest }))

export default app
