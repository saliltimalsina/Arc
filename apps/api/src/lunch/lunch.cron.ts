import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const LOW_BALANCE_THRESHOLD_MINOR = 10_000; // Rs 100 in paise

@Injectable()
export class LunchCron {
  private readonly logger = new Logger(LunchCron.name);

  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // Every 5 minutes: lock today's orders whose cutoff has passed
  @Cron(CronExpression.EVERY_5_MINUTES)
  async lockOrdersAtCutoff() {
    const cutoffs = await this.prisma.lunchCutoff.findMany();
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const nowTotal = now.getHours() * 60 + now.getMinutes();
    for (const c of cutoffs) {
      const cutoffTotal = c.cutoffHour * 60 + c.cutoffMinute + c.gracePeriodMinutes;
      if (nowTotal >= cutoffTotal) {
        const res = await this.prisma.lunchOrder.updateMany({
          where: { workspaceId: c.workspaceId, date: todayUTC, lockedAt: null, cancelledAt: null },
          data: { lockedAt: now, status: "confirmed" },
        });
        if (res.count > 0) this.logger.log(`Locked ${res.count} orders for workspace ${c.workspaceId}`);
      }
    }
  }

  // Daily 21:00 local time — low-balance notification
  @Cron("0 21 * * *")
  async lowBalanceNotice() {
    const wallets = await this.prisma.lunchWallet.findMany({
      where: { balanceMinor: { lt: LOW_BALANCE_THRESHOLD_MINOR } },
    });
    for (const w of wallets) {
      await this.notifications.create({
        recipientId: w.userId,
        kind: "lunch.balance.low",
        entityType: "lunchWallet",
        entityId: w.id,
        payload: { balanceMinor: w.balanceMinor, thresholdMinor: LOW_BALANCE_THRESHOLD_MINOR },
      });
    }
    this.logger.log(`Sent low-balance notice to ${wallets.length} users`);
  }
}
