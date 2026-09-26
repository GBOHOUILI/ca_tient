import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { IdeaAccessGuard } from "../ideas/idea-access.guard.js";
import { PaymentService } from "./payment.service.js";

@Controller("ideas")
@UseGuards(IdeaAccessGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentService) {}

  @Post(":id/payments")
  @HttpCode(HttpStatus.CREATED)
  start(@Param("id") id: string) {
    return this.payments.startCheckout(id);
  }

  @Get(":id/payment")
  status(@Param("id") id: string) {
    return this.payments.getStatus(id);
  }
}
