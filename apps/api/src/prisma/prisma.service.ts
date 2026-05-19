import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const SOFT_DELETE_MODELS = new Set([
  "Project",
  "Item",
  "Sprint",
  "Comment",
  "Goal",
  "Milestone",
  "Team",
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Soft-delete auto-filter on the 7 listed models. Uses $use middleware which
    // is "deprecated" in Prisma 5+ but still supported and runs server-side only.
    // Switching to $extends would require typed proxy adjustments across every
    // service in the codebase — kept here as a controlled, single-file rule.
    this.$use(async (params, next) => {
      if (!params.model || !SOFT_DELETE_MODELS.has(params.model)) return next(params);

      const args = (params.args ??= {});
      const action = params.action;

      const injectFilter = (where: any) => {
        if (!where) return { deletedAt: null };
        if (Object.prototype.hasOwnProperty.call(where, "deletedAt")) return where;
        if (where.OR || where.AND) {
          return { AND: [where, { deletedAt: null }] };
        }
        return { ...where, deletedAt: null };
      };

      if (action === "findUnique" || action === "findFirst") {
        if (action === "findUnique") {
          params.action = "findFirst" as any;
        }
        args.where = injectFilter(args.where);
      } else if (action === "findMany" || action === "count" || action === "updateMany" || action === "deleteMany") {
        args.where = injectFilter(args.where);
      }
      return next(params);
    });

    await this.$connect();
  }
}
