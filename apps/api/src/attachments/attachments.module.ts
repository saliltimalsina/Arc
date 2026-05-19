import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AttachmentsService } from "./attachments.service";
import { AttachmentsController } from "./attachments.controller";

@Module({
  imports: [PrismaModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
