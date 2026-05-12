import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TeamsService } from "./teams.service";
import { CreateTeamDto, UpdateTeamDto, AddMemberDto, UpdateMemberRoleDto } from "./dto/team.dto";

@UseGuards(JwtAuthGuard)
@Controller("teams")
export class TeamsController {
  constructor(private readonly svc: TeamsService) {}

  @Post()
  createTeam(@Request() req: any, @Body() dto: CreateTeamDto) {
    return this.svc.createTeam(req.user.id, dto);
  }

  @Get()
  listMyTeams(@Request() req: any) {
    return this.svc.listMyTeams(req.user.id);
  }

  @Get(":id")
  getTeam(@Request() req: any, @Param("id") id: string) {
    return this.svc.getTeam(req.user.id, id);
  }

  @Patch(":id")
  updateTeam(@Request() req: any, @Param("id") id: string, @Body() dto: UpdateTeamDto) {
    return this.svc.updateTeam(req.user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTeam(@Request() req: any, @Param("id") id: string) {
    return this.svc.deleteTeam(req.user.id, id);
  }

  @Post(":id/members")
  addMember(@Request() req: any, @Param("id") id: string, @Body() dto: AddMemberDto) {
    return this.svc.addMember(req.user.id, id, dto);
  }

  @Delete(":id/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Request() req: any,
    @Param("id") id: string,
    @Param("userId") targetUserId: string,
  ) {
    return this.svc.removeMember(req.user.id, id, targetUserId);
  }

  @Patch(":id/members/:userId")
  updateMemberRole(
    @Request() req: any,
    @Param("id") id: string,
    @Param("userId") targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.svc.updateMemberRole(req.user.id, id, targetUserId, dto);
  }
}

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly svc: TeamsService) {}

  @Get("search")
  searchUsers(@Query("q") q: string) {
    return this.svc.searchUsers(q ?? "");
  }
}
