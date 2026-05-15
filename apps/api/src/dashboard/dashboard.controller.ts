import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DashboardService } from "./dashboard.service";

@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get()
  getDashboard(@Request() req: any) {
    return this.svc.getDashboard(req.user.id);
  }
}
