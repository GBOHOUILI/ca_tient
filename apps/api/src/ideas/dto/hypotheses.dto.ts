import { IsInt, Max, Min } from "class-validator";
import { MAX_DB_INT } from "./db-int.js";

export class HypothesesDto {
  @IsInt()
  @Min(1)
  @Max(MAX_DB_INT)
  price!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_DB_INT)
  volume!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_DB_INT)
  variableCostPerUnit!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_DB_INT)
  fixedCosts!: number;
}
