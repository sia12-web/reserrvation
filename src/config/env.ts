import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";

function requireInProduction(value: string | undefined, name: string): string {
  if (nodeEnv === "production" && (!value || value.trim().length === 0)) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value ?? "";
}

export const env = {
  nodeEnv,
  databaseUrl: requireInProduction(process.env.DATABASE_URL, "DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  stripeSecretKey: requireInProduction(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"),
  stripeWebhookSecret: requireInProduction(
    process.env.STRIPE_WEBHOOK_SECRET,
    "STRIPE_WEBHOOK_SECRET"
  ),
  businessHoursStart: Number(process.env.BUSINESS_HOURS_START ?? "17"),
  businessHoursEnd: Number(process.env.BUSINESS_HOURS_END ?? "22"),
  smtpHost: process.env.SMTP_HOST ?? "localhost",
  smtpPort: Number(process.env.SMTP_PORT ?? "1025"),
  mailFrom: process.env.MAIL_FROM ?? "no-reply@reservation.com",
  adminPin: requireInProduction(process.env.ADMIN_PIN, "ADMIN_PIN"),
  depositThreshold: Number(process.env.DEPOSIT_THRESHOLD ?? "10"),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",").map(o => o.trim()),
  jwtSecret: requireInProduction(process.env.JWT_SECRET, "JWT_SECRET"),
};
