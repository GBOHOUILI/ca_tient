import { IsInt, Min } from "class-validator";

export class HypothesesDto {
  @IsInt()
  @Min(1)
  price!: number;

  @IsInt()
  @Min(0)
  volume!: number;

  @IsInt()
  @Min(0)
  variableCostPerUnit!: number;

  @IsInt()
  @Min(0)
  fixedCosts!: number;
}
