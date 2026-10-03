import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MaxLength(500)
  comment!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  displayName?: string;

  @IsBoolean()
  publishConsent!: boolean;
}

export const MODERATION_STATUSES = ["pending", "published", "hidden"] as const;

export class ModerateReviewDto {
  @IsIn(MODERATION_STATUSES)
  status!: (typeof MODERATION_STATUSES)[number];
}
