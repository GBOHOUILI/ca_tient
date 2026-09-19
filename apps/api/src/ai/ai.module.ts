import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AiController } from "./ai.controller.js";
import { GeminiProvider } from "./gemini.provider.js";
import { AI_PROVIDER } from "./ai-provider.port.js";

@Module({
  imports: [ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 10 }])],
  controllers: [AiController],
  providers: [{ provide: AI_PROVIDER, useClass: GeminiProvider }],
  exports: [AI_PROVIDER],
})
export class AiModule {}
