import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import type { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger("HTTP");

  // Disable Express ETag — prevents browser serving stale 304 responses after mutations
  app.set("etag", false);

  app.use((req: any, res: any, next: any) => {
    res.on("finish", () => {
      logger.log(`${req.method} ${req.originalUrl} → ${res.statusCode}`);
    });
    next();
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors({ origin: process.env.WEB_URL || "http://localhost:3000" });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
