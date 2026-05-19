import { Body, Controller, Post, Get, HttpCode, UseGuards, Request, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { randomBytes } from "crypto";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { AUTH_COOKIE_NAME } from "./strategies/jwt.strategy";

export const CSRF_COOKIE_NAME = "mantra_csrf";

const isProd = process.env.NODE_ENV === "production";

function attachAuthCookies(res: Response, token: string) {
  const cookieOpts = {
    httpOnly: true,
    sameSite: (isProd ? "strict" : "lax") as "strict" | "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  };
  res.cookie(AUTH_COOKIE_NAME, token, cookieOpts);
  // CSRF: readable by JS, double-submit pattern. Same lifetime as token.
  res.cookie(CSRF_COOKIE_NAME, randomBytes(24).toString("hex"), {
    ...cookieOpts,
    httpOnly: false,
  });
}

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("signup")
  @Throttle({ medium: { limit: 5, ttl: 60_000 }, long: { limit: 20, ttl: 3_600_000 } })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto.name, dto.email, dto.password);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ medium: { limit: 10, ttl: 60_000 }, long: { limit: 100, ttl: 3_600_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password);
    attachAuthCookies(res, result.access_token);
    return result;
  }

  @Post("verify-otp")
  @HttpCode(200)
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.verifyOtp(dto.email, dto.otp);
    attachAuthCookies(res, result.access_token);
    return result;
  }

  @Post("resend-otp")
  @HttpCode(200)
  @Throttle({ medium: { limit: 2, ttl: 60_000 }, long: { limit: 10, ttl: 3_600_000 } })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendOtp(dto.email);
  }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ medium: { limit: 3, ttl: 60_000 }, long: { limit: 10, ttl: 3_600_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @HttpCode(200)
  @Throttle({ medium: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post("logout")
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
    res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
    return;
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  getMe(@Request() req: any) {
    return this.auth.getMe(req.user.id);
  }
}
