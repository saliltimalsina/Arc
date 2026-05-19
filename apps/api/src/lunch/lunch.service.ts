import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateMealDto, UpdateMealDto, CreateAddonDto } from "./dto/meal.dto";
import { CreateOrderDto, UpdateOrderDto } from "./dto/order.dto";
import { TopupDto, CutoffDto, SuggestionDto } from "./dto/wallet.dto";

function dayKey(d: Date): Date {
  // UTC midnight of the given date — Prisma @db.Date stores as date only
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDate(s: string): Date {
  const d = new Date(s);
  if (isNaN(+d)) throw new BadRequestException("Invalid date");
  return dayKey(d);
}

@Injectable()
export class LunchService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // ── Workspace resolution ────────────────────────────────────────────────
  private async getWorkspaceId(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultWorkspaceId: true },
    });
    if (!u?.defaultWorkspaceId) throw new BadRequestException("User has no default workspace");
    return u.defaultWorkspaceId;
  }

  private async assertWorkspaceAdmin(userId: string, workspaceId: string) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!m) throw new ForbiddenException("Not a workspace member");
    if (!["owner", "admin"].includes(m.role)) throw new ForbiddenException("Admin only");
  }

  // ── Meals ───────────────────────────────────────────────────────────────
  async listMeals(userId: string, dateStr?: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const meals = await this.prisma.meal.findMany({
      where: { workspaceId, active: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 50,
      include: { addons: { where: { active: true } } },
    });
    if (dateStr) {
      const dow = parseDate(dateStr).getUTCDay();
      return meals.filter(m => m.availableDows.includes(dow));
    }
    return meals;
  }

  async createMeal(userId: string, dto: CreateMealDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    return this.prisma.meal.create({
      data: {
        workspaceId,
        key: dto.key.toLowerCase().slice(0, 40),
        name: dto.name,
        emoji: dto.emoji ?? "🥗",
        description: dto.description ?? null,
        basePriceMinor: dto.basePriceMinor,
        kcal: dto.kcal ?? null,
        dietary: dto.dietary ?? null,
        availableDows: dto.availableDows,
        extraLabel: dto.extraLabel ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateMeal(userId: string, mealId: string, dto: UpdateMealDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    const meal = await this.prisma.meal.findFirst({ where: { id: mealId, workspaceId } });
    if (!meal) throw new NotFoundException("Meal not found");
    return this.prisma.meal.update({ where: { id: mealId }, data: dto });
  }

  async deleteMeal(userId: string, mealId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    const meal = await this.prisma.meal.findFirst({ where: { id: mealId, workspaceId } });
    if (!meal) throw new NotFoundException();
    await this.prisma.meal.update({ where: { id: mealId }, data: { deletedAt: new Date(), active: false } });
  }

  async createAddon(userId: string, dto: CreateAddonDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    return this.prisma.mealAddon.create({
      data: {
        workspaceId,
        mealId: dto.mealId ?? null,
        key: dto.key.toLowerCase().slice(0, 40),
        name: dto.name,
        unitPriceMinor: dto.unitPriceMinor,
        maxQty: dto.maxQty,
      },
    });
  }

  // ── Cutoff ──────────────────────────────────────────────────────────────
  async getCutoff(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const row = await this.prisma.lunchCutoff.findUnique({ where: { workspaceId } });
    return row ?? { workspaceId, cutoffHour: 10, cutoffMinute: 30, gracePeriodMinutes: 0, timezone: "Asia/Kathmandu" };
  }

  async setCutoff(userId: string, dto: CutoffDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    return this.prisma.lunchCutoff.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        cutoffHour: dto.cutoffHour,
        cutoffMinute: dto.cutoffMinute,
        gracePeriodMinutes: dto.gracePeriodMinutes ?? 0,
        timezone: dto.timezone ?? "Asia/Kathmandu",
      },
      update: {
        cutoffHour: dto.cutoffHour,
        cutoffMinute: dto.cutoffMinute,
        gracePeriodMinutes: dto.gracePeriodMinutes ?? 0,
        timezone: dto.timezone ?? "Asia/Kathmandu",
      },
    });
  }

  private async isAfterCutoff(workspaceId: string, date: Date): Promise<boolean> {
    const today = dayKey(new Date());
    if (date.getTime() > today.getTime()) return false;
    if (date.getTime() < today.getTime()) return true;
    const cfg = await this.prisma.lunchCutoff.findUnique({ where: { workspaceId } });
    const h = cfg?.cutoffHour ?? 10;
    const m = cfg?.cutoffMinute ?? 30;
    const grace = cfg?.gracePeriodMinutes ?? 0;
    const now = new Date();
    const cutoffTotal = h * 60 + m + grace;
    const nowTotal = now.getHours() * 60 + now.getMinutes();
    return nowTotal >= cutoffTotal;
  }

  // ── Orders ──────────────────────────────────────────────────────────────
  async listOrders(userId: string, fromStr?: string, toStr?: string) {
    const from = fromStr ? parseDate(fromStr) : dayKey(new Date(Date.now() - 30 * 86_400_000));
    const to = toStr ? parseDate(toStr) : dayKey(new Date(Date.now() + 30 * 86_400_000));
    return this.prisma.lunchOrder.findMany({
      where: { userId, date: { gte: from, lte: to }, cancelledAt: null },
      orderBy: { date: "asc" },
      include: { meal: { select: { id: true, key: true, name: true, emoji: true, basePriceMinor: true } } },
      take: 200,
    });
  }

  async getCalendar(userId: string, monthStr: string) {
    const [yr, mo] = monthStr.split("-").map(Number);
    if (!yr || !mo) throw new BadRequestException("month must be YYYY-MM");
    const start = new Date(Date.UTC(yr, mo - 1, 1));
    const end = new Date(Date.UTC(yr, mo, 1));
    const orders = await this.prisma.lunchOrder.findMany({
      where: { userId, date: { gte: start, lt: end }, cancelledAt: null },
      include: { meal: { select: { id: true, key: true, name: true, emoji: true } } },
      orderBy: { date: "asc" },
    });
    return orders.map(o => ({
      date: o.date,
      day: o.date.getUTCDate(),
      mealKey: o.meal.key,
      mealName: o.meal.name,
      emoji: o.meal.emoji,
      status: o.status,
      totalCostMinor: o.totalCostMinor,
    }));
  }

  private async computeCost(meal: { basePriceMinor: number }, addonsInput: Record<string, number> | undefined, workspaceId: string): Promise<{ totalMinor: number; resolvedAddons: Record<string, number> }> {
    let total = meal.basePriceMinor;
    const resolved: Record<string, number> = {};
    if (addonsInput && Object.keys(addonsInput).length > 0) {
      const keys = Object.keys(addonsInput);
      const addonRows = await this.prisma.mealAddon.findMany({
        where: { workspaceId, key: { in: keys }, active: true },
      });
      const byKey = new Map(addonRows.map(a => [a.key, a]));
      for (const k of keys) {
        const cfg = byKey.get(k);
        if (!cfg) continue;
        const qty = Math.max(0, Math.min(addonsInput[k] | 0, cfg.maxQty));
        if (qty > 0) {
          resolved[k] = qty;
          total += cfg.unitPriceMinor * qty;
        }
      }
    }
    return { totalMinor: total, resolvedAddons: resolved };
  }

  async placeOrder(userId: string, dto: CreateOrderDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    const date = parseDate(dto.date);

    if (await this.isAfterCutoff(workspaceId, date)) {
      throw new BadRequestException("Cutoff passed for that date");
    }

    let targetUserId = userId;
    let placedById = userId;
    if (dto.onBehalfOfUserId && dto.onBehalfOfUserId !== userId) {
      const perm = await this.prisma.lunchProxyPermission.findUnique({
        where: { granterId_grantedToId_workspaceId: { granterId: dto.onBehalfOfUserId, grantedToId: userId, workspaceId } },
      });
      if (!perm) throw new ForbiddenException("No proxy permission");
      if (perm.expiresAt && +perm.expiresAt < Date.now()) throw new ForbiddenException("Proxy permission expired");
      targetUserId = dto.onBehalfOfUserId;
    }

    const meal = await this.prisma.meal.findFirst({
      where: { id: dto.mealId, workspaceId, deletedAt: null, active: true },
    });
    if (!meal) throw new NotFoundException("Meal not available");
    const dow = date.getUTCDay();
    if (!meal.availableDows.includes(dow)) throw new BadRequestException("Meal not available that day");

    const { totalMinor, resolvedAddons } = await this.computeCost(meal, dto.addons, workspaceId);

    return this.prisma.$transaction(async tx => {
      const wallet = await tx.lunchWallet.upsert({
        where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
        create: { userId: targetUserId, workspaceId, balanceMinor: 0 },
        update: {},
      });

      const existing = await tx.lunchOrder.findUnique({
        where: { userId_date: { userId: targetUserId, date } },
      });
      if (existing && !existing.cancelledAt) {
        throw new ConflictException("Order already exists for that date — use PATCH");
      }

      if (wallet.balanceMinor < totalMinor) {
        throw new BadRequestException("Insufficient wallet balance");
      }

      const order = await tx.lunchOrder.create({
        data: {
          workspaceId,
          userId: targetUserId,
          placedByUserId: placedById,
          onBehalfOfUserId: targetUserId !== placedById ? targetUserId : null,
          date,
          mealId: meal.id,
          addons: resolvedAddons,
          totalCostMinor: totalMinor,
          notes: dto.notes ?? null,
          status: "planned",
        },
        include: { meal: true },
      });

      if (totalMinor > 0) {
        await tx.lunchWallet.update({
          where: { id: wallet.id },
          data: { balanceMinor: { decrement: totalMinor } },
        });
        await tx.lunchTransaction.create({
          data: {
            walletId: wallet.id,
            kind: "charge",
            amountMinor: -totalMinor,
            status: "verified",
            verifiedAt: new Date(),
            description: `Lunch ${meal.name} (${date.toISOString().slice(0, 10)})`,
            orderId: order.id,
          },
        });
      }

      return order;
    });
  }

  async updateOrder(userId: string, orderId: string, dto: UpdateOrderDto) {
    const order = await this.prisma.lunchOrder.findUnique({
      where: { id: orderId },
      include: { meal: true },
    });
    if (!order) throw new NotFoundException();
    if (order.userId !== userId && order.placedByUserId !== userId) throw new ForbiddenException();

    const workspaceId = order.workspaceId;
    if (await this.isAfterCutoff(workspaceId, order.date)) {
      throw new BadRequestException("Cutoff passed");
    }

    return this.prisma.$transaction(async tx => {
      const wallet = await tx.lunchWallet.findUnique({
        where: { userId_workspaceId: { userId: order.userId, workspaceId } },
      });
      if (!wallet) throw new NotFoundException("Wallet not found");

      // refund old charge
      const refundAmt = order.totalCostMinor;
      if (refundAmt > 0) {
        await tx.lunchWallet.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: refundAmt } } });
        await tx.lunchTransaction.create({
          data: {
            walletId: wallet.id,
            kind: "refund",
            amountMinor: refundAmt,
            status: "verified",
            verifiedAt: new Date(),
            description: `Refund order ${order.id}`,
            orderId: order.id,
          },
        });
      }

      const newMeal = dto.mealId
        ? await tx.meal.findFirst({ where: { id: dto.mealId, workspaceId, active: true, deletedAt: null } })
        : order.meal;
      if (!newMeal) throw new NotFoundException("Meal not available");
      const dow = order.date.getUTCDay();
      if (!newMeal.availableDows.includes(dow)) throw new BadRequestException("Meal not available that day");

      const addonsInput = dto.addons ?? ((order.addons as Record<string, number>) ?? undefined);
      const { totalMinor, resolvedAddons } = await this.computeCost(newMeal, addonsInput, workspaceId);

      const fresh = await tx.lunchWallet.findUnique({ where: { id: wallet.id } });
      if (!fresh || fresh.balanceMinor < totalMinor) throw new BadRequestException("Insufficient balance after refund");

      if (totalMinor > 0) {
        await tx.lunchWallet.update({ where: { id: wallet.id }, data: { balanceMinor: { decrement: totalMinor } } });
        await tx.lunchTransaction.create({
          data: {
            walletId: wallet.id,
            kind: "charge",
            amountMinor: -totalMinor,
            status: "verified",
            verifiedAt: new Date(),
            description: `Updated lunch ${newMeal.name}`,
            orderId: order.id,
          },
        });
      }

      return tx.lunchOrder.update({
        where: { id: order.id },
        data: {
          mealId: newMeal.id,
          addons: resolvedAddons,
          totalCostMinor: totalMinor,
          notes: dto.notes !== undefined ? dto.notes : order.notes,
        },
        include: { meal: true },
      });
    });
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.lunchOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException();
    if (order.userId !== userId && order.placedByUserId !== userId) throw new ForbiddenException();
    if (order.cancelledAt) return order;
    if (await this.isAfterCutoff(order.workspaceId, order.date)) {
      throw new BadRequestException("Cutoff passed");
    }

    return this.prisma.$transaction(async tx => {
      const wallet = await tx.lunchWallet.findUnique({
        where: { userId_workspaceId: { userId: order.userId, workspaceId: order.workspaceId } },
      });
      if (wallet && order.totalCostMinor > 0) {
        await tx.lunchWallet.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: order.totalCostMinor } } });
        await tx.lunchTransaction.create({
          data: {
            walletId: wallet.id,
            kind: "refund",
            amountMinor: order.totalCostMinor,
            status: "verified",
            verifiedAt: new Date(),
            description: `Cancelled order ${order.id}`,
            orderId: order.id,
          },
        });
      }
      return tx.lunchOrder.update({
        where: { id: order.id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
    });
  }

  // ── Wallet ──────────────────────────────────────────────────────────────
  async getWallet(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const wallet = await this.prisma.lunchWallet.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      create: { userId, workspaceId, balanceMinor: 0 },
      update: {},
    });
    const recent = await this.prisma.lunchTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return { balanceMinor: wallet.balanceMinor, recent };
  }

  async listTransactions(userId: string, limit: number, cursor?: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const wallet = await this.prisma.lunchWallet.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!wallet) return { data: [], nextCursor: null };
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.prisma.lunchTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async requestTopup(userId: string, dto: TopupDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    const wallet = await this.prisma.lunchWallet.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      create: { userId, workspaceId, balanceMinor: 0 },
      update: {},
    });
    // For manual: pending, awaits admin verify. For esewa/khalti: still pending until webhook.
    return this.prisma.lunchTransaction.create({
      data: {
        walletId: wallet.id,
        kind: "topup",
        amountMinor: dto.amountMinor,
        status: "pending",
        provider: dto.provider,
        externalRef: dto.externalRef ?? null,
        description: `Top-up via ${dto.provider}`,
      },
    });
  }

  async verifyTopup(userId: string, txId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    const tx = await this.prisma.lunchTransaction.findUnique({ where: { id: txId }, include: { wallet: true } });
    if (!tx) throw new NotFoundException();
    if (tx.kind !== "topup") throw new BadRequestException("Not a top-up");
    if (tx.status === "verified") return tx;
    return this.prisma.$transaction(async dbtx => {
      await dbtx.lunchWallet.update({
        where: { id: tx.walletId },
        data: { balanceMinor: { increment: tx.amountMinor } },
      });
      const updated = await dbtx.lunchTransaction.update({
        where: { id: tx.id },
        data: { status: "verified", verifiedAt: new Date() },
      });
      await this.notifications.create({
        recipientId: tx.wallet.userId,
        kind: "lunch.topup.verified",
        entityType: "lunchTransaction",
        entityId: tx.id,
        payload: { amountMinor: tx.amountMinor },
      });
      return updated;
    });
  }

  async listPendingTopups(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    return this.prisma.lunchTransaction.findMany({
      where: { status: "pending", kind: "topup", wallet: { workspaceId } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { wallet: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
  }

  // ── Team status (kitchen sheet) ─────────────────────────────────────────
  async kitchenSheet(userId: string, dateStr: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    const date = parseDate(dateStr);
    const orders = await this.prisma.lunchOrder.findMany({
      where: { workspaceId, date, cancelledAt: null },
      include: {
        meal: { select: { id: true, key: true, name: true, emoji: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { user: { name: "asc" } },
    });
    const counts = orders.reduce<Record<string, { name: string; emoji: string; count: number }>>((acc, o) => {
      const k = o.meal.key;
      acc[k] = acc[k] ?? { name: o.meal.name, emoji: o.meal.emoji, count: 0 };
      acc[k].count++;
      return acc;
    }, {});
    return { date, orders, counts };
  }

  // ── Team-status (workspace-wide for today; opt-in privacy via WorkspaceMember role) ─
  async teamStatus(userId: string, dateStr?: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const date = dateStr ? parseDate(dateStr) : dayKey(new Date());
    const orders = await this.prisma.lunchOrder.findMany({
      where: { workspaceId, date, cancelledAt: null },
      include: {
        meal: { select: { id: true, key: true, name: true, emoji: true } },
        user: { select: { id: true, name: true } },
      },
    });
    return orders.map(o => ({
      userId: o.user.id,
      userName: o.user.name,
      mealKey: o.meal.key,
      mealEmoji: o.meal.emoji,
      mealName: o.meal.name,
      status: o.status,
    }));
  }

  // ── Suggestions ─────────────────────────────────────────────────────────
  async createSuggestion(userId: string, dto: SuggestionDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    return this.prisma.lunchSuggestion.create({
      data: {
        workspaceId,
        userId,
        category: dto.category.slice(0, 40),
        body: dto.body,
      },
    });
  }

  async listSuggestions(userId: string, status: string = "open") {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    return this.prisma.lunchSuggestion.findMany({
      where: { workspaceId, ...(status === "all" ? {} : { status }) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async setSuggestionStatus(userId: string, id: string, status: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertWorkspaceAdmin(userId, workspaceId);
    if (!["open", "reviewed", "closed"].includes(status)) throw new BadRequestException();
    return this.prisma.lunchSuggestion.update({
      where: { id },
      data: { status, reviewedAt: status !== "open" ? new Date() : null },
    });
  }

  // ── Proxies ─────────────────────────────────────────────────────────────
  async grantProxy(userId: string, grantedToId: string, expiresAt?: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    if (grantedToId === userId) throw new BadRequestException("Cannot grant to self");
    return this.prisma.lunchProxyPermission.upsert({
      where: { granterId_grantedToId_workspaceId: { granterId: userId, grantedToId, workspaceId } },
      create: {
        workspaceId,
        granterId: userId,
        grantedToId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      update: { expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
  }

  async revokeProxy(userId: string, grantedToId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.prisma.lunchProxyPermission.deleteMany({
      where: { workspaceId, granterId: userId, grantedToId },
    });
  }

  async listProxiesIGrant(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    return this.prisma.lunchProxyPermission.findMany({
      where: { workspaceId, granterId: userId },
      include: { grantedTo: { select: { id: true, name: true, email: true } } },
    });
  }

  async listProxiesGrantedToMe(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    return this.prisma.lunchProxyPermission.findMany({
      where: { workspaceId, grantedToId: userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { granter: { select: { id: true, name: true, email: true } } },
    });
  }
}
