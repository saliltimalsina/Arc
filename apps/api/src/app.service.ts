import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  health() {
    return { status: "ok", service: "mantra-arc-api", timestamp: new Date() };
  }
}
