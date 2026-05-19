import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { ScheduleModule } from "@nestjs/schedule";
import { randomUUID } from "crypto";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { ProjectsModule } from "./projects/projects.module";
import { TeamsModule } from "./teams/teams.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ActivityModule } from "./activity/activity.module";
import { AttachmentsModule } from "./attachments/attachments.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { MembershipModule } from "./membership/membership.module";
import { UsersModule } from "./users/users.module";
import { RbacModule } from "./rbac/rbac.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { LunchModule } from "./lunch/lunch.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CsrfMiddleware } from "./common/csrf.middleware";

@Module({
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req, res) => {
          const incoming = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
          res.setHeader("x-request-id", incoming);
          return incoming;
        },
        autoLogging: { ignore: (req) => req.url === "/health" },
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'req.body.password',
            'req.body.otp',
            'req.body.token',
          ],
          remove: true,
        },
        transport: process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { singleLine: true, colorize: true, translateTime: "HH:MM:ss" } }
          : undefined,
      },
    }),
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 10 },
      { name: "medium", ttl: 60_000, limit: 60 },
      { name: "long", ttl: 3_600_000, limit: 1000 },
    ]),
    PrismaModule,
    RedisModule,
    MailModule,
    AuthModule,
    ProjectsModule,
    TeamsModule,
    DashboardModule,
    ActivityModule,
    AttachmentsModule,
    NotificationsModule,
    MembershipModule,
    UsersModule,
    RbacModule,
    WorkspacesModule,
    LunchModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes("*");
  }
}
