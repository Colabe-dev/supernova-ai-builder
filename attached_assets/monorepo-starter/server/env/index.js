import 'dotenv/config';
import { EnvSchema } from './schema.js';
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) { console.error('Invalid env', parsed.error.flatten()); process.exit(1); }
export const config = parsed.data;
