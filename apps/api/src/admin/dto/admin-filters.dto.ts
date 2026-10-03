import { BusinessModel } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "financial-engine";
import { PROFILE_COUNTRIES } from "../../ideas/dto/idea-profile.dto.js";
import { LOCALES, type Locale } from "../../i18n/locale.js";

export const ADMIN_PERIODS = ["7d", "30d", "90d", "all"] as const;
export type AdminPeriod = (typeof ADMIN_PERIODS)[number];

export class AdminFiltersDto {
  @IsOptional()
  @IsIn(ADMIN_PERIODS)
  period?: AdminPeriod;

  @IsOptional()
  @IsEnum(BusinessModel)
  businessModel?: BusinessModel;

  @IsOptional()
  @IsIn(PROFILE_COUNTRIES)
  country?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: CurrencyCode;

  @IsOptional()
  @IsIn(LOCALES)
  locale?: Locale;
}

export class AdminIdeasQueryDto extends AdminFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(["true", "false"])
  paid?: "true" | "false";
}
