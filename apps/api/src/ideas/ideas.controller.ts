import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { IdeasService } from "./ideas.service.js";
import { CreateIdeaDto } from "./dto/create-idea.dto.js";
import { UpdateCanvasBlocksDto } from "./dto/update-canvas-blocks.dto.js";
import { CapitalPlanDto } from "./dto/capital-plan.dto.js";
import { IdeaAccessGuard } from "./idea-access.guard.js";
import { PaidIdeaGuard } from "./paid-idea.guard.js";
import { ReportService } from "./report.service.js";

@Controller("ideas")
export class IdeasController {
  constructor(
    private readonly ideasService: IdeasService,
    private readonly reportService: ReportService,
  ) {}

  @Post()
  create(@Body() dto: CreateIdeaDto) {
    return this.ideasService.create(dto);
  }

  @Put(":id")
  @UseGuards(IdeaAccessGuard)
  update(@Param("id") id: string, @Body() dto: CreateIdeaDto) {
    return this.ideasService.update(id, dto);
  }

  @Get(":id")
  @UseGuards(IdeaAccessGuard)
  async findOne(@Param("id") id: string) {
    const idea = await this.ideasService.findOne(id);
    if (!idea) {
      throw new NotFoundException(`Idee ${id} introuvable.`);
    }
    return idea;
  }

  @Patch(":id/canvas-blocks")
  @UseGuards(IdeaAccessGuard)
  async updateCanvasBlocks(@Param("id") id: string, @Body() dto: UpdateCanvasBlocksDto) {
    await this.ideasService.updateCanvasBlocks(id, dto);
    return { ok: true };
  }

  @Put(":id/capital")
  @UseGuards(IdeaAccessGuard, PaidIdeaGuard)
  saveCapital(@Param("id") id: string, @Body() dto: CapitalPlanDto) {
    return this.reportService.saveCapital(id, dto);
  }

  @Get(":id/report")
  @UseGuards(IdeaAccessGuard, PaidIdeaGuard)
  getReport(@Param("id") id: string) {
    return this.reportService.getReport(id);
  }
}
