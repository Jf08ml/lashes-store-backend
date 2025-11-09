import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import app from "../app";
import { connectDB } from "../config/db";

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

// Crear el handler serverless
const serverlessHandler = serverless(app, {
  request: (req: any) => {
    // Agregar logs para debugging
    console.log(`📥 ${req.method} ${req.url}`);
  },
  response: (res: any) => {
    console.log(`📤 Response status: ${res.statusCode}`);
  }
});

const handler = async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Timeout de 25 segundos (límite de Vercel es 30s para hobby plan)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 25000);
    });

    const handleRequest = async () => {
      await ensureDbConnection();
      return serverlessHandler(req, res);
    };

    await Promise.race([handleRequest(), timeoutPromise]);
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
