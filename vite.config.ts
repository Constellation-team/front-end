import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Vite plugin that proxies /api/chat requests to DeepSeek API.
 * The API key stays server-side and is NEVER exposed to the browser.
 */
function deepseekProxy(): Plugin {
  let apiKey = ''

  return {
    name: 'deepseek-proxy',
    configureServer(server) {
      // Read DEEPSEEK_API_KEY directly from .env file
      try {
        const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
        const match = envContent.match(/^(?:VITE_)?DEEPSEEK_API_KEY=(.+)$/m)
        apiKey = match ? match[1].trim() : ''
      } catch {
        apiKey = ''
      }

      if (!apiKey) {
        console.warn('\n⚠️  DEEPSEEK_API_KEY not found in .env — chatbot will not work.\n')
      }

      server.middlewares.use('/api/chat', async (req, res) => {
        // Only accept POST
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY no está configurada en el archivo .env' }))
          return
        }

        // Read request body
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }

        try {
          const deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body,
          })

          const data = await deepseekRes.text()
          res.statusCode = deepseekRes.status
          res.setHeader('Content-Type', 'application/json')
          res.end(data)
        } catch (err) {
          console.error('DeepSeek proxy error:', err)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: 'No se pudo conectar con la API de DeepSeek. Verifica tu conexión a internet.',
          }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), deepseekProxy()],
})
