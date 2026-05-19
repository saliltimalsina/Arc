import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { projectRoleHas, PermissionKey } from "./permissions";

export const PROJECT_PERM_KEY = "project:permission";
export const RequireProjectPermission = (perm: PermissionKey) => SetMetadata(PROJECT_PERM_KEY, perm);

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey>(PROJECT_PERM_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException();

    const projectId = req.params.id || req.params.projectId;
    if (!projectId) throw new ForbiddenException("No project context");

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, members: { where: { userId }, select: { role: true } } },
    });
    if (!project) throw new NotFoundException("Project not found");

    const role = project.ownerId === userId ? "owner" : project.members[0]?.role;
    if (!projectRoleHas(role, required)) {
      throw new ForbiddenException(`Missing permission ${required}`);
    }
    return true;
  }
}
