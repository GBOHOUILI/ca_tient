import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { IdeasService } from "./ideas.service.js";
import { CreateIdeaDto } from "./dto/create-idea.dto.js";

@Controller("ideas")
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post()
  create(@Body() dto: CreateIdeaDto) {
    return this.ideasService.create(dto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const idea = await this.ideasService.findOne(id);
    if (!idea) {
      throw new NotFoundException(`Idee ${id} introuvable.`);
    }
    return idea;
  }
}
