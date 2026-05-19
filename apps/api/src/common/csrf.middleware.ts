import { Injectable, NestMiddleware, ForbiddenException } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { AUTH_COOKIE_NAME } from "../auth/strategies/jwt.strategy";

const CSRF_COOKIE = "mantra_csrf";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/verify-otp",
  "/api/auth/resend-otp",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
  "/api/lunch/webhooks/esewa",
  "/api/lunch/webhooks/khalti",
]);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next();
    if (EXEMPT_PATHS.has(req.originalUrl.split("?")[0])) return next();

    // Only enforce when the client is using cookie auth. Bearer-token clients are exempt.
    const hasAuthCookie = !!(req as any).cookies?.[AUTH_COOKIE_NAME];
    if (!hasAuthCookie) return next();

    const cookieToken = (req as any).cookies?.[CSRF_COOKIE];
    const headerToken = (req.headers[CSRF_HEADER] as string | undefined) || (req.headers[CSRF_HEADER.toLowerCase()] as string | undefined);
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException("CSRF token missing or invalid");
    }
    next();
  }
}
