import { Type } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, IsString, MaxLength, ValidateNested } from "class-validator";
import { BusinessModel } from "@prisma/client";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
import { HypothesesDto } from "./hypotheses.dto.js";

export class CreateIdeaDto {
  @IsEnum(BusinessModel)
  businessModel!: BusinessModel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rawDescription!: string;

  @IsIn(SUPPORTED_CURRENCIES)
  currency!: CurrencyCode;

  @ValidateNested()
  @Type(() => HypothesesDto)
  hypotheses!: HypothesesDto;
}
