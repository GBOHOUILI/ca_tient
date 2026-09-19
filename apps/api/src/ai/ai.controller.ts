import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AI_PROVIDER, type AiProvider } from "./ai-provider.port.js";
import { SuggestHypothesesDto } from "./dto/suggest-hypotheses.dto.js";

@Controller("ideas")
export class AiController {
  constructor(@Inject(AI_PROVIDER) private readonly aiProvider: AiProvider) {}

  @Post("suggest-hypotheses")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async suggestHypotheses(@Body() dto: SuggestHypothesesDto) {
    const hypotheses = await this.aiProvider.suggestHypotheses(dto);

    if (!hypotheses) {
      return { available: false as const };
    }

    return { available: true as const, hypotheses };
  }
}
