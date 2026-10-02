import { Controller, Get } from "@nestjs/common";
import { analysisPriceXof } from "./pricing.js";

// Public: the web app shows the price the server will actually charge.
@Controller("pricing")
export class PricingController {
  @Get()
  get() {
    return { analysisPriceXof: analysisPriceXof() };
  }
}
