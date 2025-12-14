import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import app from "../src/app";
import { connectDB } from "../src/config/db";

let isConnected = false;

async function ensureDbConnection() {
  if (isConnected) {
    console.log("♻️ Reutilizando conexión existente");
    return;
  }

  const startTime = Date.now();
  try {
    console.log("🔗 Iniciando conexión a MongoDB...");
    console.log("📍 MONGODB_URI exists:", !!process.env.MONGODB_URI);
    
    await connectDB();
    
    isConnected = true;
    const duration = Date.now() - startTime;
    console.log(`✅ MongoDB conectado en ${duration}ms`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error MongoDB después de ${duration}ms:`, error?.message || error);
    throw error;
  }
}

// Crear el handler serverless
const serverlessHandler = serverless(app);

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const startTime = Date.now();
  
  try {
    console.log(`📥 ${req.method} ${req.url} - Start`);
    
    // CORS headers - configurar ANTES de cualquier respuesta
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
    
    // Preflight - responder inmediatamente
    if (req.method === 'OPTIONS') {
      console.log(`✅ OPTIONS request handled in ${Date.now() - startTime}ms`);
      return res.status(200).end();
    }

    // Conectar a MongoDB solo si es necesario
    const skipDb = req.url === '/' || req.url === '/api/test' || req.url === '/api/health';
    
    if (!skipDb) {
      try {
        // Timeout de 8 segundos para la conexión
        await Promise.race([
          ensureDbConnection(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('MongoDB connection timeout')), 8000)
          )
        ]);
      } catch (dbError: any) {
        console.error(`⚠️ Error de BD después de ${Date.now() - startTime}ms:`, dbError?.message);
        // Continuar sin DB para endpoints que no la requieran
      }
    } else {
      console.log(`⏭️ Skipping DB connection for ${req.url}`);
    }
    
    // Procesar request
    console.log(`⚙️ Processing with serverless handler...`);
    await serverlessHandler(req, res);
    
    const duration = Date.now() - startTime;
    console.log(`📤 Completado ${res.statusCode} en ${duration}ms`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error handler después de ${duration}ms:`, error?.message || error);
    console.error('Stack:', error?.stack);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        result: "error", 
        message: "Error interno del servidor",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        duration: `${duration}ms`
      });
    }
  }
};

export default handler;