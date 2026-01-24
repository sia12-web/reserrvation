import nodemailer from "nodemailer";
import { env } from "./env";

const auth = env.smtpUser && env.smtpPass ? {
    user: env.smtpUser,
    pass: env.smtpPass,
} : undefined;

export const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.nodeEnv === "production", // true for 465, false for other ports usually. 
    auth,
});
