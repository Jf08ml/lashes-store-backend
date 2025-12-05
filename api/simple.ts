import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Simple endpoint funcionando",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    environment: {
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      vercel_region: process.env.VERCEL_REGION,
    }
  });
}