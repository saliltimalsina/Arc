import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get("search")
  searchUsers(@Query("q") q: string) {
    return this.svc.search(q ?? "");
  }
}
