import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(private config: ConfigService) {
    const port = Number(this.config.get("SMTP_PORT") ?? 587);
    this.transporter = nodemailer.createTransport({
      host: this.config.get("SMTP_HOST"),
      port,
      secure: port === 465,
      auth: {
        user: this.config.get("SMTP_USER"),
        pass: this.config.get("SMTP_PASS"),
      },
    });
    this.from = this.config.get("SMTP_FROM") ?? this.config.get("SMTP_USER") ?? "noreply@mantraideas.com.np";
  }

  async sendOtp(to: string, name: string, otp: string) {
    await this.transporter.sendMail({
      from: `Mantra <${this.from}>`,
      to,
      subject: `${otp} is your Mantra verification code`,
      html: this.otpHtml(name, otp),
    });
  }

  async sendResetLink(to: string, name: string, token: string) {
    const base = this.config.get("WEB_URL") || "http://localhost:3000";
    const url = `${base}/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: `Mantra <${this.from}>`,
      to,
      subject: "Reset your Mantra password",
      html: this.resetHtml(name, url),
    });
  }

  private otpHtml(name: string, otp: string) {
    return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F7F5F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid rgba(20,20,28,0.07);overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#FF6B5C,#F97316,#F5A524);padding:28px 40px">
          <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.03em">Mantra</span>
        </td></tr>
        <tr><td style="padding:40px">
          <p style="margin:0 0 8px;font-size:15px;color:#3F4350">Hi ${name},</p>
          <p style="margin:0 0 32px;font-size:15px;color:#6C7180;line-height:1.6">
            Use the code below to verify your email. Expires in <strong>10 minutes</strong>.
          </p>
          <div style="text-align:center;margin:0 0 32px">
            <span style="display:inline-block;padding:20px 40px;background:#F7F5F1;border-radius:12px;font-size:36px;font-weight:700;letter-spacing:0.15em;color:#15161B">
              ${otp}
            </span>
          </div>
          <p style="margin:0;font-size:13px;color:#9A9FAB">If you didn't request this, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private resetHtml(name: string, url: string) {
    return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F7F5F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid rgba(20,20,28,0.07);overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#FF6B5C,#F97316,#F5A524);padding:28px 40px">
          <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.03em">Mantra</span>
        </td></tr>
        <tr><td style="padding:40px">
          <p style="margin:0 0 8px;font-size:15px;color:#3F4350">Hi ${name},</p>
          <p style="margin:0 0 32px;font-size:15px;color:#6C7180;line-height:1.6">
            Click below to reset your password. Link expires in <strong>15 minutes</strong>.
          </p>
          <div style="text-align:center;margin:0 0 32px">
            <a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#FF6B5C,#F97316,#F5A524);color:white;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none">
              Reset password
            </a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#9A9FAB">Or copy this link:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#9A9FAB;word-break:break-all">${url}</p>
          <p style="margin:0;font-size:13px;color:#9A9FAB">If you didn't request this, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
