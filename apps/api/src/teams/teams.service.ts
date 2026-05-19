import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTeamDto, UpdateTeamDto, AddMemberDto, UpdateMemberRoleDto } from "./dto/team.dto";

const MEMBER_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async createTeam(userId: string, dto: CreateTeamDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { defaultWorkspaceId: true } });
    const team = await this.prisma.team.create({
      data: {
        workspaceId: user?.defaultWorkspaceId ?? null,
        name: dto.name,
        emoji: dto.emoji ?? "🏢",
        color: dto.color ?? "#338EF7",
        members: { create: { userId, role: "owner" } },
      },
      include: { members: { include: MEMBER_INCLUDE } },
    });
    return team;
  }

  async listMyTeams(userId: string) {
    return this.prisma.team.findMany({
      where: { members: { some: { userId } }, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        members: { include: MEMBER_INCLUDE },
        _count: { select: { projects: true } },
      },
    });
  }

  async getTeam(userId: string, teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { include: MEMBER_INCLUDE },
        projects: {
          select: { id: true, name: true, emoji: true, color: true, status: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!team) throw new NotFoundException("Team not found");
    this.assertTeamMember(team.members, userId);
    return team;
  }

  async updateTeam(userId: string, teamId: string, dto: UpdateTeamDto) {
    await this.assertTeamRole(userId, teamId, ["owner", "admin"]);
    return this.prisma.team.update({
      where: { id: teamId },
      data: dto,
      include: { members: { include: MEMBER_INCLUDE } },
    });
  }

  async deleteTeam(userId: string, teamId: string) {
    await this.assertTeamRole(userId, teamId, ["owner"]);
    await this.prisma.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
  }

  async addMember(userId: string, teamId: string, dto: AddMemberDto) {
    await this.assertTeamRole(userId, teamId, ["owner", "admin"]);

    const target = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true, name: true, email: true, emailVerified: true },
    });
    if (!target) throw new NotFoundException("User not registered");
    if (!target.emailVerified) throw new BadRequestException("User email not verified");

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: target.id } },
    });
    if (existing) throw new ConflictException("User already in team");

    await this.prisma.teamMember.create({
      data: { teamId, userId: target.id, role: dto.role ?? "member" },
    });

    return this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { include: MEMBER_INCLUDE } },
    });
  }

  async removeMember(userId: string, teamId: string, targetUserId: string) {
    await this.assertTeamRole(userId, teamId, ["owner", "admin"]);

    const target = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException("Member not found");
    if (target.role === "owner") throw new ForbiddenException("Cannot remove owner");

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
  }

  async updateMemberRole(
    userId: string,
    teamId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.assertTeamRole(userId, teamId, ["owner"]);

    const target = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException("Member not found");
    if (target.role === "owner" && dto.role !== "owner") {
      const owners = await this.prisma.teamMember.count({ where: { teamId, role: "owner" } });
      if (owners <= 1) throw new ForbiddenException("Cannot demote the only owner.");
    }

    return this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      data: { role: dto.role },
      include: MEMBER_INCLUDE,
    });
  }

  async searchUsers(q: string) {
    if (!q || q.trim().length < 2) return [];
    const term = q.trim().toLowerCase();
    return this.prisma.user.findMany({
      where: {
        emailVerified: true,
        OR: [
          { email: { contains: term, mode: "insensitive" } },
          { name:  { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private assertTeamMember(members: { userId: string }[], userId: string) {
    if (!members.some((m) => m.userId === userId))
      throw new ForbiddenException("Not a team member");
  }

  private async assertTeamRole(userId: string, teamId: string, roles: string[]) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });
    if (!member) throw new ForbiddenException("Not a team member");
    if (!roles.includes(member.role)) throw new ForbiddenException("Insufficient role");
  }
}
