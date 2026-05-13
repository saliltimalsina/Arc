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
  const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === "true";

  const allowedOrigins = [
    "http://localhost:3000",
    "http://168.144.120.212:3002",
    ...(process.env.WEB_URL ? process.env.WEB_URL.split(",").map((o) => o.trim()).filter(Boolean) : []),
  ];

  // If not allowing all origins, return an explicit 403 JSON response for disallowed origins
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin as string | undefined;
    if (
      !allowAllOrigins &&
      origin &&
      !allowedOrigins.some((o) => origin === o || origin.endsWith(".vercel.app") || origin.endsWith(".mantraideas.com.np"))
    ) {
      res.status(403).json({ error: "CORS origin not allowed" });
      return;
    }
    next();
  });

  app.enableCors({
    origin: allowAllOrigins
      ? true
      : (origin, cb) => {
          if (!origin || allowedOrigins.some((o) => origin === o || origin.endsWith(".vercel.app") || origin.endsWith(".mantraideas.com.np"))) {
            cb(null, true);
          } else {
            cb(null, false);
          }
        },
    credentials: true,
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
