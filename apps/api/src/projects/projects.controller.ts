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
import { ProjectsService } from "./projects.service";
import { CreateProjectDto, UpdateProjectDto } from "./dto/project.dto";
import { CreateSprintDto, UpdateSprintDto, CompleteSprintDto } from "./dto/sprint.dto";
import { CreateItemDto, UpdateItemDto, CreateCommentDto } from "./dto/item.dto";

@UseGuards(JwtAuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  @Get()
  listProjects(@Request() req: any) {
    return this.svc.listProjects(req.user.id);
  }

  @Post()
  createProject(@Request() req: any, @Body() dto: CreateProjectDto) {
    return this.svc.createProject(req.user.id, dto);
  }

  @Get(":id")
  getProject(@Request() req: any, @Param("id") id: string) {
    return this.svc.getProject(req.user.id, id);
  }

  @Patch(":id")
  updateProject(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.svc.updateProject(req.user.id, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProject(@Request() req: any, @Param("id") id: string) {
    return this.svc.deleteProject(req.user.id, id);
  }

  // ── Sprints ───────────────────────────────────────────────────────────────

  @Get(":id/sprints")
  listSprints(@Request() req: any, @Param("id") id: string) {
    return this.svc.listSprints(req.user.id, id);
  }

  @Post(":id/sprints")
  createSprint(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: CreateSprintDto,
  ) {
    return this.svc.createSprint(req.user.id, id, dto);
  }

  @Patch(":id/sprints/:sprintId")
  updateSprint(
    @Request() req: any,
    @Param("id") id: string,
    @Param("sprintId") sprintId: string,
    @Body() dto: UpdateSprintDto,
  ) {
    return this.svc.updateSprint(req.user.id, id, sprintId, dto);
  }

  @Post(":id/sprints/:sprintId/complete")
  completeSprint(
    @Request() req: any,
    @Param("id") id: string,
    @Param("sprintId") sprintId: string,
    @Body() dto: CompleteSprintDto,
  ) {
    return this.svc.completeSprint(req.user.id, id, sprintId, dto);
  }

  @Delete(":id/sprints/:sprintId")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSprint(
    @Request() req: any,
    @Param("id") id: string,
    @Param("sprintId") sprintId: string,
  ) {
    return this.svc.deleteSprint(req.user.id, id, sprintId);
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  @Get(":id/items")
  listItems(
    @Request() req: any,
    @Param("id") id: string,
    @Query("sprintId") sprintId?: string,
  ) {
    return this.svc.listItems(req.user.id, id, sprintId);
  }

  @Post(":id/items")
  createItem(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.svc.createItem(req.user.id, id, dto);
  }

  @Patch(":id/items/:itemId")
  updateItem(
    @Request() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.svc.updateItem(req.user.id, id, itemId, dto);
  }

  @Delete(":id/items/:itemId")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteItem(
    @Request() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.svc.deleteItem(req.user.id, id, itemId);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @Get(":id/items/:itemId/comments")
  listComments(
    @Request() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.svc.listComments(req.user.id, id, itemId);
  }

  @Post(":id/items/:itemId/comments")
  createComment(
    @Request() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.svc.createComment(req.user.id, id, itemId, dto);
  }

  @Delete(":id/comments/:commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(
    @Request() req: any,
    @Param("id") id: string,
    @Param("commentId") commentId: string,
  ) {
    return this.svc.deleteComment(req.user.id, id, commentId);
  }
}
