import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import rateLimit from "express-rate-limit";

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many login attempts, please try again after 15 minutes" },
});

router.post(
    "/login",
    loginLimiter,
    asyncHandler(async (req, res) => {
        const { pin } = req.body;

        if (pin !== env.adminPin) {
            throw new HttpError(401, "Invalid admin PIN");
        }

        const token = jwt.sign({ role: "ADMIN" }, env.jwtSecret, {
            expiresIn: "8h",
        });

        res.cookie("admin_token", token, {
            httpOnly: true,
            secure: env.nodeEnv === "production",
            sameSite: "strict",
            maxAge: 8 * 60 * 60 * 1000, // 8 hours
        });

        res.json({ message: "Login successful" });
    })
);

router.get(
    "/me",
    (req, res, next) => {
        // We reuse the logic in adminAuth middleware but here we want to return 200 if OK
        try {
            const { adminAuth } = require("../middleware/auth");
            adminAuth(req, res, () => {
                res.json({ authenticated: true });
            });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/logout",
    (req, res) => {
        res.clearCookie("admin_token");
        res.json({ message: "Logged out successfully" });
    }
);

export default router;
