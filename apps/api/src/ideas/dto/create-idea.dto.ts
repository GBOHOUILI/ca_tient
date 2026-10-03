import { Type } from "class-transformer";
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { BusinessModel } from "@prisma/client";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
import { LOCALES, type Locale } from "../../i18n/locale.js";
import { AcquisitionDto } from "./acquisition.dto.js";
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

  // Fixed at creation (ignored on update): the language the idea was written in.
  @IsOptional()
  @IsIn(LOCALES)
  locale?: Locale;

  @ValidateNested()
  @Type(() => HypothesesDto)
  hypotheses!: HypothesesDto;

  // Only read on creation: the source is where the idea came from, not where it was last edited.
  @IsOptional()
  @ValidateNested()
  @Type(() => AcquisitionDto)
  acquisition?: AcquisitionDto;
}
