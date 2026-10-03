import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { BusinessModel } from "@prisma/client";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
import { LOCALES, type Locale } from "../../i18n/locale.js";

export class SuggestHypothesesDto {
  @IsEnum(BusinessModel)
  businessModel!: BusinessModel;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  rawDescription!: string;

  @IsIn(SUPPORTED_CURRENCIES)
  currency!: CurrencyCode;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: Locale;
}
