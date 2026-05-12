import { Module } from "@nestjs/common";
import { TeamsController, UsersController } from "./teams.controller";
import { TeamsService } from "./teams.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TeamsController, UsersController],
  providers: [TeamsService],
})
export class TeamsModule {}
