import { IsString, IsOptional, IsIn, IsEmail, MinLength, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class AddMemberDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email: string;

  @IsOptional()
  @IsIn(["admin", "member"])
  role?: string;
}

export class UpdateMemberRoleDto {
  @IsIn(["admin", "member"])
  role: string;
}
