import mongoose from "mongoose";
import "dotenv/config";

const DB_URI = process.env.MONGODB_URI || process.env.DB_URI || process.env.MONGO_URI;
const MAX_RETRIES = 2; // Reducir reintentos para serverless
const RETRY_DELAY = 1000; // 1 segundo más rápido

// Configuración ultra optimizada para Vercel serverless (10s límite)
const mongooseOptions = {
  maxPoolSize: 3, // Pool pequeño para serverless
  serverSelectionTimeoutMS: 3000, // 3 segundos máximo
  socketTimeoutMS: 8000, // 8 segundos
  connectTimeoutMS: 3000, // 3 segundos para conectar
  maxIdleTimeMS: 20000, // Cerrar conexiones idle rápido
};

export async function connectDB(): Promise<void> {
  if (!DB_URI) {
    console.error("❌ MONGODB_URI no está definida");
    throw new Error("MONGODB_URI no configurada");
  }

  console.log("🔍 Verificando estado de conexión...");
  console.log("📊 ReadyState:", mongoose.connections[0]?.readyState);
  
  // Reutilizar conexión si ya existe
  if (mongoose.connections[0].readyState === 1) {
    console.log("✅ Conexión existente activa");
    return;
  }

  // Conexión simple sin reintentos (Vercel maneja esto)
  try {
    console.log("🚀 Intentando conectar con mongoose...");
    console.log("⚙️ Options:", JSON.stringify(mongooseOptions));
    
    await mongoose.connect(DB_URI, mongooseOptions);
    
    console.log("📡 Conexión establecida con MongoDB");
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", (error as Error).message);
    throw error;
  }
}
