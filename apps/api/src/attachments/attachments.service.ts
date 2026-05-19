import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as fs from "fs";
import * as path from "path";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file

const ALLOWED_MIME = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/markdown", "text/csv",
]);

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  }

  async upload(userId: string, file: Express.Multer.File, ownerType: string, ownerId: string) {
    if (!file) throw new BadRequestException("No file uploaded");
    if (file.size > MAX_BYTES) throw new BadRequestException(`File exceeds ${MAX_BYTES} bytes`);
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException(`Disallowed mime type: ${file.mimetype}`);

    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const fname = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const filePath = path.join(UPLOAD_ROOT, fname);
    fs.writeFileSync(filePath, file.buffer);

    const itemId = ownerType === "item" ? ownerId : null;
    const att = await this.prisma.attachment.create({
      data: {
        ownerType,
        ownerId,
        itemId,
        url: `/api/files/${fname}`,
        filename: file.originalname.slice(0, 200),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploaderId: userId,
      },
    });
    return att;
  }

  async get(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException();
    return att;
  }

  async listForOwner(ownerType: string, ownerId: string) {
    return this.prisma.attachment.findMany({
      where: { ownerType, ownerId },
      orderBy: { createdAt: "desc" },
      include: { uploader: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(userId: string, id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException();
    if (att.uploaderId !== userId) throw new ForbiddenException();
    const fname = path.basename(att.url);
    const filePath = path.join(UPLOAD_ROOT, fname);
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    await this.prisma.attachment.delete({ where: { id } });
  }

  filePathFor(filename: string): string {
    const safe = path.basename(filename);
    return path.join(UPLOAD_ROOT, safe);
  }
}
