import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, HttpCode,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LunchService } from "./lunch.service";
import { CreateMealDto, UpdateMealDto, CreateAddonDto } from "./dto/meal.dto";
import { CreateOrderDto, UpdateOrderDto } from "./dto/order.dto";
import { TopupDto, CutoffDto, SuggestionDto } from "./dto/wallet.dto";

@UseGuards(JwtAuthGuard)
@Controller("lunch")
export class LunchController {
  constructor(private svc: LunchService) {}

  // Meals
  @Get("meals")
  meals(@Request() req: any, @Query("date") date?: string) {
    return this.svc.listMeals(req.user.id, date);
  }
  @Post("meals")
  createMeal(@Request() req: any, @Body() dto: CreateMealDto) {
    return this.svc.createMeal(req.user.id, dto);
  }
  @Patch("meals/:id")
  updateMeal(@Request() req: any, @Param("id") id: string, @Body() dto: UpdateMealDto) {
    return this.svc.updateMeal(req.user.id, id, dto);
  }
  @Delete("meals/:id")
  @HttpCode(204)
  deleteMeal(@Request() req: any, @Param("id") id: string) {
    return this.svc.deleteMeal(req.user.id, id);
  }
  @Post("addons")
  createAddon(@Request() req: any, @Body() dto: CreateAddonDto) {
    return this.svc.createAddon(req.user.id, dto);
  }

  // Orders
  @Get("orders")
  orders(@Request() req: any, @Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.listOrders(req.user.id, from, to);
  }
  @Get("calendar")
  calendar(@Request() req: any, @Query("month") month: string) {
    return this.svc.getCalendar(req.user.id, month);
  }
  @Post("orders")
  placeOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.svc.placeOrder(req.user.id, dto);
  }
  @Patch("orders/:id")
  updateOrder(@Request() req: any, @Param("id") id: string, @Body() dto: UpdateOrderDto) {
    return this.svc.updateOrder(req.user.id, id, dto);
  }
  @Delete("orders/:id")
  @HttpCode(200)
  cancelOrder(@Request() req: any, @Param("id") id: string) {
    return this.svc.cancelOrder(req.user.id, id);
  }

  // Wallet
  @Get("wallet")
  wallet(@Request() req: any) {
    return this.svc.getWallet(req.user.id);
  }
  @Get("transactions")
  transactions(
    @Request() req: any,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.svc.listTransactions(req.user.id, limit ? parseInt(limit, 10) || 30 : 30, cursor);
  }
  @Post("wallet/topup")
  topup(@Request() req: any, @Body() dto: TopupDto) {
    return this.svc.requestTopup(req.user.id, dto);
  }
  @Post("wallet/topups/:id/verify")
  @HttpCode(200)
  verifyTopup(@Request() req: any, @Param("id") id: string) {
    return this.svc.verifyTopup(req.user.id, id);
  }
  @Get("wallet/pending-topups")
  pendingTopups(@Request() req: any) {
    return this.svc.listPendingTopups(req.user.id);
  }

  // Cutoff
  @Get("cutoff")
  getCutoff(@Request() req: any) {
    return this.svc.getCutoff(req.user.id);
  }
  @Patch("cutoff")
  setCutoff(@Request() req: any, @Body() dto: CutoffDto) {
    return this.svc.setCutoff(req.user.id, dto);
  }

  // Team / kitchen
  @Get("team-status")
  team(@Request() req: any, @Query("date") date?: string) {
    return this.svc.teamStatus(req.user.id, date);
  }
  @Get("kitchen-sheet")
  kitchen(@Request() req: any, @Query("date") date: string) {
    return this.svc.kitchenSheet(req.user.id, date);
  }

  // Suggestions
  @Post("suggestions")
  createSuggestion(@Request() req: any, @Body() dto: SuggestionDto) {
    return this.svc.createSuggestion(req.user.id, dto);
  }
  @Get("suggestions")
  listSuggestions(@Request() req: any, @Query("status") status?: string) {
    return this.svc.listSuggestions(req.user.id, status ?? "open");
  }
  @Patch("suggestions/:id")
  setSuggestionStatus(@Request() req: any, @Param("id") id: string, @Body() dto: { status: string }) {
    return this.svc.setSuggestionStatus(req.user.id, id, dto.status);
  }

  // Proxies
  @Post("proxies/:userId")
  grantProxy(
    @Request() req: any,
    @Param("userId") targetUserId: string,
    @Body() dto: { expiresAt?: string },
  ) {
    return this.svc.grantProxy(req.user.id, targetUserId, dto.expiresAt);
  }
  @Delete("proxies/:userId")
  @HttpCode(204)
  revokeProxy(@Request() req: any, @Param("userId") targetUserId: string) {
    return this.svc.revokeProxy(req.user.id, targetUserId);
  }
  @Get("proxies/granted")
  proxiesGranted(@Request() req: any) {
    return this.svc.listProxiesIGrant(req.user.id);
  }
  @Get("proxies/received")
  proxiesReceived(@Request() req: any) {
    return this.svc.listProxiesGrantedToMe(req.user.id);
  }
}
