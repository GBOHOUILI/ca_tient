import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { FinancialEngineModule } from './financial-engine/financial-engine.module.js';
import { IdeasModule } from './ideas/ideas.module.js';

@Module({
  imports: [FinancialEngineModule, IdeasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
