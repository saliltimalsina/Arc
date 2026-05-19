import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { MailService } from "../mail/mail.service";
import * as bcrypt from "bcrypt";
import { randomBytes, randomInt } from "crypto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private mail: MailService,
  ) {}

  private fireOtp(email: string, name: string, otp: string) {
    this.mail.sendOtp(email, name, otp).catch(err =>
      this.logger.error(`OTP email failed for ${email}: ${err.message}`),
    );
  }

  private fireResetLink(email: string, name: string, token: string) {
    this.mail.sendResetLink(email, name, token).catch(err =>
      this.logger.error(`Reset email failed for ${email}: ${err.message}`),
    );
  }

  async signup(name: string, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { name, email, passwordHash } });
      const slugBase = (name || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "workspace";
      const slug = `${slugBase}-${user.id.slice(-6)}`;
      const ws = await tx.workspace.create({
        data: { name: `${name}'s workspace`, slug, ownerId: user.id },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId: user.id, role: "owner" },
      });
      await tx.user.update({ where: { id: user.id }, data: { defaultWorkspaceId: ws.id } });
    });

    const otp = this.generateOtp();
    await this.redis.set(`otp:${email}`, JSON.stringify({ otp, attempts: 0, createdAt: Date.now() }), 600);
    this.fireOtp(email, name, otp);

    return { message: "Verification code sent", email };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Constant-time arm: run a dummy bcrypt compare so missing-user latency matches valid-user
      await bcrypt.compare(password, "$2b$12$0000000000000000000000000000000000000000000000000000");
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    if (!user.emailVerified) {
      // Throttle OTP regen to once per 60s to prevent OTP-spam-via-login
      const raw = await this.redis.get(`otp:${email}`);
      const last = raw ? this.parseOtpPayload(raw).createdAt ?? 0 : 0;
      if (Date.now() - last >= 60_000) {
        const otp = this.generateOtp();
        await this.redis.set(`otp:${email}`, JSON.stringify({ otp, attempts: 0, createdAt: Date.now() }), 600);
        this.fireOtp(email, user.name, otp);
      }
      throw new UnauthorizedException("Email not verified. A new code has been sent if eligible.");
    }

    return { access_token: this.sign(user.id, user.email), user: this.safeUser(user) };
  }

  private parseOtpPayload(raw: string): { otp: string; attempts: number; createdAt?: number } {
    try { return JSON.parse(raw); } catch { return { otp: raw, attempts: 0 }; }
  }

  async verifyOtp(email: string, otp: string) {
    const raw = await this.redis.get(`otp:${email}`);
    if (!raw) throw new BadRequestException("Code expired. Request a new one.");

    let payload: { otp: string; attempts: number; createdAt?: number };
    try { payload = JSON.parse(raw); } catch { payload = { otp: raw, attempts: 0 }; }

    if (payload.attempts >= 5) {
      await this.redis.del(`otp:${email}`);
      throw new BadRequestException("Too many failed attempts. Request a new code.");
    }

    if (payload.otp !== otp) {
      payload.attempts += 1;
      await this.redis.set(`otp:${email}`, JSON.stringify(payload), 600);
      throw new BadRequestException("Incorrect code.");
    }

    const user = await this.prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });

    await this.redis.del(`otp:${email}`);
    return { access_token: this.sign(user.id, user.email), user: this.safeUser(user) };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException("No account with that email.");
    if (user.emailVerified) throw new BadRequestException("Email already verified.");

    const raw = await this.redis.get(`otp:${email}`);
    if (raw) {
      let payload: { otp: string; attempts: number; createdAt?: number };
      try { payload = JSON.parse(raw); } catch { payload = { otp: raw, attempts: 0 }; }
      const age = payload.createdAt ? Date.now() - payload.createdAt : Infinity;
      if (age < 60_000) throw new BadRequestException("Please wait before requesting another code.");
    }

    const otp = this.generateOtp();
    await this.redis.set(`otp:${email}`, JSON.stringify({ otp, attempts: 0, createdAt: Date.now() }), 600);
    this.fireOtp(email, user.name, otp);

    return { message: "Code resent" };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always do equal-cost work to prevent enumeration via response latency
    const token = randomBytes(32).toString("hex");
    await this.redis.set(`reset:${token}`, user ? email : "__decoy__", 900);
    if (user) {
      this.fireResetLink(email, user.name, token);
    } else {
      await bcrypt.compare("decoy", "$2b$12$0000000000000000000000000000000000000000000000000000");
    }
    return { message: "If that email exists, a reset link has been sent." };
  }

  async resetPassword(token: string, password: string) {
    const email = await this.redis.get(`reset:${token}`);
    if (!email || email === "__decoy__") throw new BadRequestException("Reset link expired or invalid.");

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({ where: { email }, data: { passwordHash } });
    await this.redis.del(`reset:${token}`);

    return { message: "Password updated. You can now log in." };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.safeUser(user);
  }

  private generateOtp() {
    return String(randomInt(100000, 1000000));
  }

  private sign(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
  }

  private safeUser(user: { id: string; email: string; name: string; emailVerified: boolean }) {
    return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified };
  }
}
