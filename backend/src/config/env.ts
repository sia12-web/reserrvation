import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive().default(5000)),
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL').default('http://localhost:3000'),
    UNIVERSITY_DOMAINS: z
      .string()
      .min(1, 'UNIVERSITY_DOMAINS must be provided')
      .transform((val) => val.split(',').map((d) => d.trim()))
      .default('.edu,.ualberta.ca,.ubc.ca,.utoronto.ca,.mcgill.ca,.uwaterloo.ca,.queensu.ca,.mc-master.ca'),
  })
  .passthrough();

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');
      console.error('❌ Invalid environment variables:\n' + missingVars);
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
