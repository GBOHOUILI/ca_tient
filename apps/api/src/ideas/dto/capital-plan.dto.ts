import { IsInt, Max, Min } from "class-validator";

// Ceiling of a Postgres `Int` column.
const MAX_DB_INT = 2_147_483_647;

export class CapitalPlanDto {
  @IsInt()
  @Min(0)
  @Max(MAX_DB_INT)
  equipment!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_DB_INT)
  initialStock!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_DB_INT)
  openingCosts!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_DB_INT)
  other!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_DB_INT)
  availableCapital!: number;
}
