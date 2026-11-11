import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Import this module first: other modules read process.env while they load.
dotenv.config({ path: path.join(currentDir, '..', '.env'), quiet: true });
