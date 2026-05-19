import { IsEmail, IsString, Length, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class VerifyOtpDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
