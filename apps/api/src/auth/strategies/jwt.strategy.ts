import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

export const AUTH_COOKIE_NAME = "mantra_token";

function cookieExtractor(req: Request): string | null {
  const c = (req as any).cookies?.[AUTH_COOKIE_NAME];
  return typeof c === "string" && c.length > 0 ? c : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      secretOrKey: config.get<string>("JWT_SECRET")!,
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, emailVerified: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
