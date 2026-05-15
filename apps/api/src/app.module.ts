import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { ProjectsModule } from "./projects/projects.module";
import { TeamsModule } from "./teams/teams.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),
    PrismaModule,
    RedisModule,
    MailModule,
    AuthModule,
    ProjectsModule,
    TeamsModule,
    DashboardModule,
  ],
})
export class AppModule {}
