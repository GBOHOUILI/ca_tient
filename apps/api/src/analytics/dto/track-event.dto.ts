import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

// Steps the browser reports. Payments are never accepted from the client: they are read from
// the Payment/Idea tables, which only the server writes.
export const CLIENT_EVENT_TYPES = [
  "landing_view",
  "test_started",
  "offer_viewed",
  "what_if_used",
  "report_viewed",
  "report_printed",
] as const;

export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export class TrackEventDto {
  @IsIn(CLIENT_EVENT_TYPES)
  type!: ClientEventType;

  @IsString()
  @Length(8, 64)
  @Matches(/^[A-Za-z0-9-]+$/)
  sessionId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  @Matches(/^[A-Za-z0-9]+$/)
  ideaId?: string;
}

export const STATS_PERIODS = ["7d", "30d", "90d", "all"] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export class StatsQueryDto {
  @IsOptional()
  @IsIn(STATS_PERIODS)
  period?: StatsPeriod;
}
