import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { HttpError } from "./errorHandler";

export function adminAuth(req: Request, res: Response, next: NextFunction) {
    const pin = req.headers["x-admin-pin"] || req.query.pin;

    if (pin !== env.adminPin) {
        throw new HttpError(401, "Invalid or missing admin PIN");
    }

    next();
}
