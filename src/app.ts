import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import reservationsRouter from "./routes/reservations";
import layoutRouter from "./routes/layout";
import webhooksRouter from "./routes/webhooks";
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(cors({
    origin: env.allowedOrigins,
    credentials: true,
}));
app.use(cookieParser());

app.use("/webhooks", express.raw({ type: "application/json" }), webhooksRouter);

// Health check endpoint for Docker/K8s
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(express.json());

// Quick inline test
app.get("/admin/test", (_req, res) => {
    res.json({ test: "ok" });
});

app.use(layoutRouter);
app.use(reservationsRouter);
app.use("/admin", adminRouter);
console.log("Admin routes mounted at /admin");
app.use(errorHandler);

export default app;
