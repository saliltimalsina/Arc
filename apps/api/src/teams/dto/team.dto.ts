import { IsString, IsOptional, IsIn, MinLength, MaxLength } from "class-validator";

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
  @IsString()
  email: string;

  @IsOptional()
  @IsIn(["admin", "member"])
  role?: string;
}

export class UpdateMemberRoleDto {
  @IsIn(["admin", "member"])
  role: string;
}
