import {
  Controller,
  Get,
  Post,
  Put,
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
import { CreateProjectDto, UpdateProjectDto, CreateMilestoneDto, UpdateMilestoneDto, CreateGoalDto, UpdateGoalDto, AddProjectMemberDto } from "./dto/project.dto";
import { CreateSprintDto, UpdateSprintDto, CompleteSprintDto } from "./dto/sprint.dto";
import { CreateItemDto, UpdateItemDto, CreateCommentDto, SetAssigneeDto } from "./dto/item.dto";

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

  @Get("me/items")
  getMyItems(@Request() req: any) {
    return this.svc.getMyItems(req.user.id);
  }

  @Get("me/stats")
  getMyStats(@Request() req: any) {
    return this.svc.getMyStats(req.user.id);
  }

  @Get("me/activity")
  getMyActivity(@Request() req: any) {
    return this.svc.getMyActivity(req.user.id);
  }

  @Get(":id")
  getProject(@Request() req: any, @Param("id") id: string) {
    return this.svc.getProject(req.user.id, id);
  }

  @Get(":id/activity")
  getActivity(@Request() req: any, @Param("id") id: string) {
    return this.svc.getProjectActivity(req.user.id, id);
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

  @Put(":id/items/:itemId/assignee")
  setAssignee(
    @Request() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: SetAssigneeDto,
  ) {
    return this.svc.setAssignee(req.user.id, id, itemId, dto.userId ?? null);
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

  @Get(":id/items/:itemId/activity")
  listItemActivity(
    @Request() req: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.svc.listItemActivity(req.user.id, id, itemId);
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

  // ── Project Members ───────────────────────────────────────────────────────

  @Post(":id/members")
  addProjectMember(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.svc.addProjectMember(req.user.id, id, dto);
  }

  @Delete(":id/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeProjectMember(
    @Request() req: any,
    @Param("id") id: string,
    @Param("userId") targetUserId: string,
  ) {
    return this.svc.removeProjectMember(req.user.id, id, targetUserId);
  }

  // ── Goals ─────────────────────────────────────────────────────────────────

  @Get(":id/goals")
  listGoals(@Request() req: any, @Param("id") id: string) {
    return this.svc.listGoals(req.user.id, id);
  }

  @Post(":id/goals")
  createGoal(@Request() req: any, @Param("id") id: string, @Body() dto: CreateGoalDto) {
    return this.svc.createGoal(req.user.id, id, dto);
  }

  @Patch(":id/goals/:goalId")
  updateGoal(
    @Request() req: any,
    @Param("id") id: string,
    @Param("goalId") goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.svc.updateGoal(req.user.id, id, goalId, dto);
  }

  @Delete(":id/goals/:goalId")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteGoal(@Request() req: any, @Param("id") id: string, @Param("goalId") goalId: string) {
    return this.svc.deleteGoal(req.user.id, id, goalId);
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  @Post(":id/milestones")
  createMilestone(@Request() req: any, @Param("id") id: string, @Body() dto: CreateMilestoneDto) {
    return this.svc.createMilestone(req.user.id, id, dto);
  }

  @Patch(":id/milestones/:mid")
  updateMilestone(
    @Request() req: any,
    @Param("id") id: string,
    @Param("mid") mid: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.svc.updateMilestone(req.user.id, id, mid, dto);
  }

  @Delete(":id/milestones/:mid")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMilestone(@Request() req: any, @Param("id") id: string, @Param("mid") mid: string) {
    return this.svc.deleteMilestone(req.user.id, id, mid);
  }
}
