import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpCode } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspacesService } from "./workspaces.service";
import { IsString, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

class CreateWorkspaceDto {
  @IsString() @MinLength(1) @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name: string;
}

@UseGuards(JwtAuthGuard)
@Controller("workspaces")
export class WorkspacesController {
  constructor(private svc: WorkspacesService) {}

  @Get()
  listMine(@Request() req: any) {
    return this.svc.listMine(req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateWorkspaceDto) {
    return this.svc.create(req.user.id, dto.name);
  }

  @Post(":id/default")
  @HttpCode(200)
  setDefault(@Request() req: any, @Param("id") id: string) {
    return this.svc.setDefault(req.user.id, id);
  }
}
