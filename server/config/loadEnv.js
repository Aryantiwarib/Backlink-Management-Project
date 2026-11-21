import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Try server/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// 2. Try root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// 3. Fallback to process.cwd() .env
dotenv.config();
