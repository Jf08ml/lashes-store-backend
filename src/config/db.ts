import mongoose from "mongoose";
import "dotenv/config";

const DB_URI = process.env.DB_URI || process.env.MONGO_URI;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // ms = 5 segundos

export async function connectDB(): Promise<void> {
  if (!DB_URI) {
    console.error("❌ DB_URI no está configurada");
    process.exit(1);
  }

  let attempts = 0;

  const connectWithRetry = async (): Promise<void> => {
    try {
      await mongoose.connect(DB_URI);
      console.log("📡 Established connection to the database");

      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ Conexión con MongoDB perdida. Reintentando...");
        connectWithRetry();
      });

      mongoose.connection.on("reconnected", () => {
        console.log("✅ Reconexion con MongoDB exitosa");
      });
    } catch (error) {
      attempts++;
      console.error(
        `❌ Error al conectar con MongoDB (intento ${attempts}/${MAX_RETRIES}):`,
        (error as Error).message
      );

      if (attempts < MAX_RETRIES) {
        console.log(
          `🔁 Reintentando conexión en ${RETRY_DELAY / 1000} segundos...`
        );
        setTimeout(connectWithRetry, RETRY_DELAY);
      } else {
        console.error(
          "❌ Se alcanzó el número máximo de reintentos. Saliendo del proceso..."
        );
        process.exit(1);
      }
    }
  };

  await connectWithRetry();
}
