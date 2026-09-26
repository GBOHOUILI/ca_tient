import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { IdeaAccessGuard } from "../ideas/idea-access.guard.js";
import { PaymentService } from "./payment.service.js";

@Controller("ideas")
@UseGuards(IdeaAccessGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentService) {}

  @Post(":id/payments")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  start(@Param("id") id: string) {
    return this.payments.startCheckout(id);
  }

  // Not throttled: the analysis page polls this every 3 s while a payment is pending,
  // which would exceed the 10/min limit used on the other endpoints.
  @Get(":id/payment")
  status(@Param("id") id: string) {
    return this.payments.getStatus(id);
  }
}
