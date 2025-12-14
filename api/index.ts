import type { VercelRequest, VercelResponse } from "@vercel/node";
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

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const startTime = Date.now();
  
  try {
    console.log(`📥 ${req.method} ${req.url} - Start`);
    
    // Express maneja CORS, no configurar headers aquí para evitar conflictos

    // Conectar a MongoDB solo si es necesario
    const skipDb = req.url === '/' || req.url === '/api/test' || req.url === '/api/health';
    
    if (!skipDb) {
      try {
        await Promise.race([
          ensureDbConnection(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000)
          )
        ]);
      } catch (dbError: any) {
        console.error(`⚠️ Error de BD después de ${Date.now() - startTime}ms:`, dbError?.message);
      }
    } else {
      console.log(`⏭️ Skipping DB connection for ${req.url}`);
    }
    
    // Convertir IncomingMessage a Express Request de forma compatible
    console.log(`⚙️ Processing request with Express...`);
    
    // Crear una Promise que se resuelve cuando Express termina de procesar
    await new Promise<void>((resolve, reject) => {
      // Marcar cuando la respuesta ha sido enviada
      const originalEnd = res.end.bind(res);
      const originalJson = res.json.bind(res);
      const originalSend = res.send ? res.send.bind(res) : null;
      
      // Wrapper para end
      res.end = function(...args: any[]) {
        const result = originalEnd(...args);
        const duration = Date.now() - startTime;
        console.log(`📤 Response sent (end) - Status: ${res.statusCode} - Duration: ${duration}ms`);
        resolve();
        return result;
      } as any;
      
      // Wrapper para json
      res.json = function(body: any) {
        const result = originalJson(body);
        const duration = Date.now() - startTime;
        console.log(`📤 Response sent (json) - Status: ${res.statusCode} - Duration: ${duration}ms`);
        resolve();
        return result;
      } as any;
      
      // Wrapper para send si existe
      if (originalSend) {
        (res as any).send = function(...args: any[]) {
          const result = (originalSend as any).apply(this, args);
          const duration = Date.now() - startTime;
          console.log(`📤 Response sent (send) - Status: ${res.statusCode} - Duration: ${duration}ms`);
          resolve();
          return result;
        };
      }
      
      // Manejar el request con Express
      app(req as any, res as any, (err: any) => {
        if (err) {
          console.error('❌ Express error:', err);
          reject(err);
        }
      });
    });
    
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