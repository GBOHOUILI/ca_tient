import { IsEnum, IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { BusinessModel } from "@prisma/client";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";

export class SuggestHypothesesDto {
  @IsEnum(BusinessModel)
  businessModel!: BusinessModel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rawDescription!: string;

  @IsIn(SUPPORTED_CURRENCIES)
  currency!: CurrencyCode;
}
