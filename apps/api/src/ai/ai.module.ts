import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AiController } from "./ai.controller.js";
import { AI_PROVIDER } from "./ai-provider.port.js";
import { createAiProvider } from "./ai-provider.factory.js";

@Module({
  imports: [ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 10 }])],
  controllers: [AiController],
  providers: [{ provide: AI_PROVIDER, useFactory: () => createAiProvider() }],
  exports: [AI_PROVIDER],
})
export class AiModule {}
