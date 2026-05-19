import { Controller, Post, Body, Headers, BadRequestException, NotFoundException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

function safeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

@Controller("lunch/webhooks")
export class LunchWebhookController {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  @Post("esewa")
  async esewa(@Body() body: any, @Headers("x-signature") signature?: string) {
    return this.handle("esewa", process.env.ESEWA_WEBHOOK_SECRET, body, signature);
  }

  @Post("khalti")
  async khalti(@Body() body: any, @Headers("x-signature") signature?: string) {
    return this.handle("khalti", process.env.KHALTI_WEBHOOK_SECRET, body, signature);
  }

  private async handle(provider: string, secret: string | undefined, body: any, signature?: string) {
    if (!secret) throw new BadRequestException("Webhook not configured");
    const raw = JSON.stringify(body ?? {});
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    if (!signature || !safeEq(expected, signature)) {
      throw new BadRequestException("Invalid signature");
    }

    const externalRef = body?.externalRef ?? body?.transaction_uuid ?? body?.id;
    const status = body?.status ?? body?.event;
    if (!externalRef) throw new BadRequestException("Missing externalRef");

    const tx = await this.prisma.lunchTransaction.findUnique({
      where: { uniq_provider_ref: { provider, externalRef: String(externalRef) } },
      include: { wallet: true },
    });
    if (!tx) throw new NotFoundException("Transaction not found");

    if (status === "success" || status === "verified" || status === "completed") {
      if (tx.status === "verified") return { ok: true, already: true };
      await this.prisma.$transaction(async dbtx => {
        await dbtx.lunchWallet.update({
          where: { id: tx.walletId },
          data: { balanceMinor: { increment: tx.amountMinor } },
        });
        await dbtx.lunchTransaction.update({
          where: { id: tx.id },
          data: { status: "verified", verifiedAt: new Date() },
        });
      });
      await this.notifications.create({
        recipientId: tx.wallet.userId,
        kind: "lunch.topup.verified",
        entityType: "lunchTransaction",
        entityId: tx.id,
        payload: { amountMinor: tx.amountMinor, provider },
      });
      return { ok: true };
    }

    if (status === "failed" || status === "cancelled") {
      await this.prisma.lunchTransaction.update({
        where: { id: tx.id },
        data: { status: "failed" },
      });
      return { ok: true };
    }

    return { ok: true, ignored: true };
  }
}
