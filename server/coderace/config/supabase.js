import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Get the exact directory of this supabase.js file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Load the shared server/.env, so standalone scripts (seeders) see the same config as the server
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const supabaseUrl = process.env.SUPABASE_URL;
// THIS MUST MATCH THE NAME IN YOUR .env FILE EXACTLY
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("🚨 CRITICAL ERROR: Supabase URL or Key is undefined! Check your .env file and path.");
} else {
  console.log("✅ Supabase credentials successfully loaded!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;