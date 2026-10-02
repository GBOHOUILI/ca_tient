import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { IdeaAccessGuard } from "../ideas/idea-access.guard.js";
import { PaidIdeaGuard } from "../ideas/paid-idea.guard.js";
import { RedeemRecoveryCodeDto } from "./dto/redeem-recovery-code.dto.js";
import { RecoveryService } from "./recovery.service.js";

@Controller()
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}

  @Post("ideas/:id/recovery-code")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(IdeaAccessGuard, PaidIdeaGuard)
  issue(@Param("id") id: string) {
    return this.recovery.issueCode(id);
  }

  // Tighter than the 10/min default: this is the one endpoint where guessing is the attack.
  @Post("recovery")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  redeem(@Body() dto: RedeemRecoveryCodeDto) {
    return this.recovery.redeem(dto.code);
  }
}
