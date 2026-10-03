import { IsIn, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";
import { LOCALES, type Locale } from "../../i18n/locale.js";

export const DEVICES = ["mobile", "tablet", "desktop"] as const;
export type Device = (typeof DEVICES)[number];

export class PageViewDto {
  @IsString()
  @Length(8, 64)
  @Matches(/^[A-Za-z0-9-]+$/)
  visitorId!: string;

  @IsString()
  @Length(8, 64)
  @Matches(/^[A-Za-z0-9-]+$/)
  sessionId!: string;

  // Lower-case public paths only: anything else is not a page of the site.
  @IsString()
  @Length(1, 120)
  @Matches(/^\/[a-z0-9/_-]*$/)
  path!: string;

  @IsIn(LOCALES)
  locale!: Locale;

  @IsIn(DEVICES)
  device!: Device;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/)
  timeZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9.-]+$/)
  referrerHost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;
}
