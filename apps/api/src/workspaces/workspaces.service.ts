import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { randomBytes } from "crypto";

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async listMine(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: { select: { id: true, name: true, slug: true, ownerId: true, createdAt: true } } },
      orderBy: { joinedAt: "asc" },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { defaultWorkspaceId: true } });
    return memberships.map(m => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      isOwner: m.workspace.ownerId === userId,
      isDefault: user?.defaultWorkspaceId === m.workspace.id,
    }));
  }

  async create(userId: string, name: string) {
    const trimmed = (name ?? "").trim();
    if (!trimmed) throw new BadRequestException("Name required");
    const base = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "workspace";
    const slug = `${base}-${randomBytes(3).toString("hex")}`;
    return this.prisma.$transaction(async tx => {
      const ws = await tx.workspace.create({
        data: { name: trimmed, slug, ownerId: userId },
      });
      await tx.workspaceMember.create({ data: { workspaceId: ws.id, userId, role: "owner" } });
      return ws;
    });
  }

  async setDefault(userId: string, workspaceId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new ForbiddenException("Not a workspace member");
    await this.prisma.user.update({ where: { id: userId }, data: { defaultWorkspaceId: workspaceId } });
    return { defaultWorkspaceId: workspaceId };
  }
}
