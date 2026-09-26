import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsIn, IsNotEmpty, IsString, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CANVAS_BLOCK_KEYS, type CanvasBlockKey } from "../../ai/ai-provider.port.js";

const SOURCES = ["ia_suggere", "utilisateur_edite"] as const;

export class CanvasBlockDto {
  @IsIn(CANVAS_BLOCK_KEYS)
  key!: CanvasBlockKey;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;
}

export class UpdateCanvasBlocksDto {
  @ValidateNested({ each: true })
  @Type(() => CanvasBlockDto)
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ArrayUnique((block: CanvasBlockDto) => block.key)
  blocks!: CanvasBlockDto[];

  @IsIn(SOURCES)
  source!: (typeof SOURCES)[number];
}
