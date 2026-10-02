import { HeardFrom, ProjectStage, UserProfileKind } from "@prisma/client";
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

// Launch markets first (West and Central Africa), then the diaspora countries.
export const PROFILE_COUNTRIES = [
  "BJ", "TG", "CI", "SN", "BF", "NE", "ML", "GN", "CM", "GA", "CG", "CD", "NG", "GH", "FR", "BE", "CA", "OTHER",
] as const;

// E-mail or phone number (digits, spaces, optional leading +).
const CONTACT_FORMAT = /^(?:[^\s@]+@[^\s@]+\.[^\s@]+|\+?[0-9 ]{8,20})$/;

export class IdeaProfileDto {
  @IsOptional()
  @IsIn(PROFILE_COUNTRIES)
  country?: (typeof PROFILE_COUNTRIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsEnum(UserProfileKind)
  profile?: UserProfileKind;

  @IsOptional()
  @IsEnum(ProjectStage)
  stage?: ProjectStage;

  @IsOptional()
  @IsEnum(HeardFrom)
  heardFrom?: HeardFrom;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(CONTACT_FORMAT)
  contact?: string;

  @IsOptional()
  @IsBoolean()
  contactConsent?: boolean;
}
