import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { LunchService } from "./lunch.service";
import { LunchController } from "./lunch.controller";
import { LunchWebhookController } from "./lunch-webhook.controller";
import { LunchCron } from "./lunch.cron";

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [LunchController, LunchWebhookController],
  providers: [LunchService, LunchCron],
  exports: [LunchService],
})
export class LunchModule {}
