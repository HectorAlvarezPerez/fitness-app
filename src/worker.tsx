import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Serve static assets from the 'dist' directory (which acts as the site bucket)
// Cloudflare Workers Sites automatically maps 'dist' content to root paths.
// But we can explicitly handle API routes here if needed.

// Catch-all for SPA: serve index.html for any unknown route
// Note: In a Worker Site, static assets are served automatically before the worker script if they exist.
// This worker script primarily handles the fallback to index.html for client-side routing.

app.get('*', async (c) => {
    // If the asset exists (managed by Sites), it returns early.
    // If not, we manually return the content of index.html
    // However, with 'serveStatic' and KV, we need to access the manifest.
    // A simpler way for modern "Pages Functions" or standard Workers is to relying on the platform.

    // Since we are creating a standard Worker with a Site bucket:
    const asset = await c.env.__STATIC_CONTENT.get('index.html')
    if (!asset) {
        return c.text('Not Found', 404)
    }
    return c.body(asset.body, 200, {
        'Content-Type': 'text/html'
    })
})

export default app
