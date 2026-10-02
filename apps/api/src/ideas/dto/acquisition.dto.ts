import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class AcquisitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  // A bare host name (no scheme, no path): the full referrer URL may carry personal data.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9.-]+$/)
  referrerHost?: string;
}
