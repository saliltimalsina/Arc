import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ProjectPermissionGuard } from "./project-permission.guard";

@Module({
  imports: [PrismaModule],
  providers: [ProjectPermissionGuard],
  exports: [ProjectPermissionGuard],
})
export class RbacModule {}
