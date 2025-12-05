import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import app from "../src/app";
import { connectDB } from "../src/config/db";

let isConnected = false;

async function ensureDbConnection() {
  if (!isConnected) {
    try {
      console.log("🔗 Conectando a MongoDB...");
      await connectDB();
      isConnected = true;
      console.log("✅ MongoDB conectado exitosamente");
    } catch (error) {
      console.error("❌ Error conectando a MongoDB:", error);
      throw error;
    }
  }
}

// Crear el handler serverless con configuración mejorada
const serverlessHandler = serverless(app, {
  binary: false, // Asegurar que no hay problemas con encoding
});

const handler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    console.log(`📥 ${req.method} ${req.url}`);
    
    // Configurar headers CORS explícitamente
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Solo conectar a MongoDB si no es un endpoint de test básico
    if (!req.url?.includes('/api/test') || req.url?.includes('/api/test-db')) {
      // Conectar a la base de datos con timeout
      const dbPromise = ensureDbConnection();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), 8000);
      });
      
      await Promise.race([dbPromise, timeoutPromise]);
    }
    
    // Procesar la request
    await serverlessHandler(req, res);
    
    console.log(`📤 Response completed with status: ${res.statusCode}`);
  } catch (error) {
    console.error("❌ Error en handler:", error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        result: "error", 
        message: "Error interno del servidor",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
};

export default handler;