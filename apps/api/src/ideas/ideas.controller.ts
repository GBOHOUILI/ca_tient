import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Put } from "@nestjs/common";
import { IdeasService } from "./ideas.service.js";
import { CreateIdeaDto } from "./dto/create-idea.dto.js";
import { UpdateCanvasBlocksDto } from "./dto/update-canvas-blocks.dto.js";

@Controller("ideas")
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post()
  create(@Body() dto: CreateIdeaDto) {
    return this.ideasService.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: CreateIdeaDto) {
    return this.ideasService.update(id, dto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const idea = await this.ideasService.findOne(id);
    if (!idea) {
      throw new NotFoundException(`Idee ${id} introuvable.`);
    }
    return idea;
  }

  @Patch(":id/canvas-blocks")
  async updateCanvasBlocks(@Param("id") id: string, @Body() dto: UpdateCanvasBlocksDto) {
    await this.ideasService.updateCanvasBlocks(id, dto);
    return { ok: true };
  }
}
