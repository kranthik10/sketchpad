import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // Adjusted for server/config/ (2 levels up)
const projectRoot = path.resolve(serverRoot, '..');
const envPath = existsSync(path.join(projectRoot, '.env'))
  ? path.join(projectRoot, '.env')
  : path.join(projectRoot, '.env.example');

dotenv.config({
  path: envPath,
});

export const config = {
  port: Number(process.env.PORT ?? 8787),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  projectRoot,
  distRoot: path.join(projectRoot, 'dist'),
};
