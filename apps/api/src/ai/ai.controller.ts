import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AI_PROVIDER, type AiProvider } from "./ai-provider.port.js";
import { SuggestHypothesesDto } from "./dto/suggest-hypotheses.dto.js";
import { DEFAULT_LOCALE } from "../i18n/locale.js";

@Controller("ideas")
export class AiController {
  constructor(@Inject(AI_PROVIDER) private readonly aiProvider: AiProvider) {}

  @Post("suggest-hypotheses")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async suggestHypotheses(@Body() dto: SuggestHypothesesDto) {
    const hypotheses = await this.aiProvider.suggestHypotheses({ ...dto, locale: dto.locale ?? DEFAULT_LOCALE });

    if (!hypotheses) {
      return { available: false as const };
    }

    return { available: true as const, hypotheses };
  }

  @Post("suggest-canvas-blocks")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async suggestCanvasBlocks(@Body() dto: SuggestHypothesesDto) {
    const blocks = await this.aiProvider.suggestCanvasBlocks({ ...dto, locale: dto.locale ?? DEFAULT_LOCALE });

    if (!blocks) {
      return { available: false as const };
    }

    return { available: true as const, blocks };
  }
}
