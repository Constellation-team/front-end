/**
 * Vercel Serverless Function
 * Proxy to DeepSeek API for ChatBot component
 * 
 * Environment variable required:
 * - DEEPSEEK_API_KEY: Your DeepSeek API key
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'DEEPSEEK_API_KEY no está configurada en las variables de entorno de Vercel'
    });
  }

  try {
    // Forward request to DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Return DeepSeek response
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('DeepSeek API error:', error);
    return res.status(502).json({
      error: 'No se pudo conectar con la API de DeepSeek',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
