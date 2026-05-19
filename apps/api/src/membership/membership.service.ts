import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}

  async assertProjectMember(userId: string, projectId: string): Promise<{ role: string; ownerId: string }> {
    const [member, project] = await Promise.all([
      this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { role: true },
      }),
      this.prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } }),
    ]);
    if (!project) throw new NotFoundException("Project not found");
    if (project.ownerId !== userId && !member) throw new ForbiddenException("Not a project member");
    return { role: member?.role ?? (project.ownerId === userId ? "owner" : "member"), ownerId: project.ownerId };
  }

  async assertProjectRole(userId: string, projectId: string, roles: string[]): Promise<void> {
    const { role } = await this.assertProjectMember(userId, projectId);
    if (!roles.includes(role)) throw new ForbiddenException("Insufficient project role");
  }

  async assertProjectOwner(userId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    if (project.ownerId !== userId) throw new ForbiddenException("Only project owner allowed");
  }

  async getAccessibleProjectIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.project.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true },
    });
    return rows.map(r => r.id);
  }

  async assertTeamMember(userId: string, teamId: string): Promise<{ role: string }> {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });
    if (!member) throw new ForbiddenException("Not a team member");
    return member;
  }

  async assertTeamRole(userId: string, teamId: string, roles: string[]): Promise<void> {
    const { role } = await this.assertTeamMember(userId, teamId);
    if (!roles.includes(role)) throw new ForbiddenException("Insufficient team role");
  }
}
