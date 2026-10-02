import { IsInt, Max, Min } from "class-validator";
import { MAX_DB_INT } from "./db-int.js";

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
