import { Controller, Get, Post, Param, Query, UseGuards, Request, HttpCode } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  list(
    @Request() req: any,
    @Query("unread") unread?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.svc.list(req.user.id, {
      unreadOnly: unread === "1" || unread === "true",
      limit: limit ? Math.max(1, Math.min(parseInt(limit, 10) || 30, 100)) : undefined,
      cursor,
    });
  }

  @Get("unread-count")
  unreadCount(@Request() req: any) {
    return this.svc.unreadCount(req.user.id).then(count => ({ count }));
  }

  @Post(":id/read")
  @HttpCode(200)
  markRead(@Request() req: any, @Param("id") id: string) {
    return this.svc.markRead(req.user.id, id);
  }

  @Post("read-all")
  @HttpCode(200)
  markAllRead(@Request() req: any) {
    return this.svc.markAllRead(req.user.id).then(r => ({ count: r.count }));
  }
}
