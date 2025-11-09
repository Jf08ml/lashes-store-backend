import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import app from "../app";
import { connectDB } from "../config/db";

let bootstrapped = false;

async function ensureBoot() {
  if (!bootstrapped) {
    await connectDB();
    bootstrapped = true;
  }
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
  await ensureBoot();
  const wrapped = serverless(app);
  return wrapped(req, res);
};

export default handler;
