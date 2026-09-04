// Next.js reads .env.local automatically; standalone scripts do not.
// Load .env.local first, then .env as a fallback.
import { config } from 'dotenv';
config({ path: '.env.local' });
config();
