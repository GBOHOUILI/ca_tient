import { IsString, Length } from "class-validator";

export class RedeemRecoveryCodeDto {
  @IsString()
  @Length(1, 40)
  code!: string;
}
