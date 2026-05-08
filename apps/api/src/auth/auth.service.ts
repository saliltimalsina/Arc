import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { MailService } from "../mail/mail.service";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private mail: MailService,
  ) {}

  async signup(name: string, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { name, email, passwordHash },
    });

    const otp = this.generateOtp();
    await this.redis.set(`otp:${email}`, otp, 600); // 10 min
    await this.mail.sendOtp(email, name, otp);

    return { message: "Verification code sent", email };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    if (!user.emailVerified) {
      // resend OTP so they can verify
      const otp = this.generateOtp();
      await this.redis.set(`otp:${email}`, otp, 600);
      await this.mail.sendOtp(email, user.name, otp);
      throw new UnauthorizedException("Email not verified. A new code has been sent.");
    }

    return { access_token: this.sign(user.id, user.email), user: this.safeUser(user) };
  }

  async verifyOtp(email: string, otp: string) {
    const stored = await this.redis.get(`otp:${email}`);
    if (!stored) throw new BadRequestException("Code expired. Request a new one.");
    if (stored !== otp) throw new BadRequestException("Incorrect code.");

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

    const otp = this.generateOtp();
    await this.redis.set(`otp:${email}`, otp, 600);
    await this.mail.sendOtp(email, user.name, otp);

    return { message: "Code resent" };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: "If that email exists, a reset link has been sent." };

    const token = randomBytes(32).toString("hex");
    await this.redis.set(`reset:${token}`, email, 900); // 15 min
    await this.mail.sendResetLink(email, user.name, token);

    return { message: "If that email exists, a reset link has been sent." };
  }

  async resetPassword(token: string, password: string) {
    const email = await this.redis.get(`reset:${token}`);
    if (!email) throw new BadRequestException("Reset link expired or invalid.");

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({ where: { email }, data: { passwordHash } });
    await this.redis.del(`reset:${token}`);

    return { message: "Password updated. You can now log in." };
  }

  private generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private sign(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
  }

  private safeUser(user: { id: string; email: string; name: string; emailVerified: boolean }) {
    return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified };
  }
}
