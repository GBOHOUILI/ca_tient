import { Controller, Get } from "@nestjs/common";

// Liveness probe for the hosting platform: no database call, so a slow database never
// gets the API restarted.
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok" };
  }
}
