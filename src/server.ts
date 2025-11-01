import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";

const PORT = Number(process.env.PORT) || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
})();
