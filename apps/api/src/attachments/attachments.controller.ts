import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  Res,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import * as fs from "fs";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AttachmentsService } from "./attachments.service";

@Controller()
export class AttachmentsController {
  constructor(private svc: AttachmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post("attachments")
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Query("ownerType") ownerType: string,
    @Query("ownerId") ownerId: string,
  ) {
    return this.svc.upload(req.user.id, file, ownerType, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("attachments")
  list(@Query("ownerType") ownerType: string, @Query("ownerId") ownerId: string) {
    return this.svc.listForOwner(ownerType, ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("attachments/:id")
  remove(@Request() req: any, @Param("id") id: string) {
    return this.svc.remove(req.user.id, id);
  }

  // File serving: public for now via signed-ish opaque filename; can later add token auth
  @Get("files/:filename")
  serve(@Param("filename") filename: string, @Res() res: Response) {
    const filePath = this.svc.filePathFor(filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException();
    res.sendFile(filePath);
  }
}
