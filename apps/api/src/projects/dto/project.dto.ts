import { IsString, IsOptional, IsIn, IsDateString, IsInt, IsEmail, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class AddProjectMemberDto {
  @IsEmail() @MaxLength(254)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email: string;
  @IsOptional() @IsIn(["admin", "member"]) role?: string;
}

export class CreateProjectDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(20) key?: string;
  @IsOptional() @IsString() @MaxLength(8) emoji?: string;
  @IsOptional() @IsString() @MaxLength(32) color?: string;
  @IsOptional() @IsString() @MaxLength(120) client?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class CreateMilestoneDto {
  @IsString() name: string;
  @IsDateString() date: string;
  @IsOptional() @IsInt() position?: number;
}

export class UpdateMilestoneDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsInt() position?: number;
}

export class CreateGoalDto {
  @IsString() name: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() color?: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsInt() position?: number;
}

export class UpdateGoalDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() position?: number;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(8) emoji?: string;
  @IsOptional() @IsString() @MaxLength(32) color?: string;
  @IsOptional() @IsString() @MaxLength(120) client?: string;
  @IsOptional() @IsIn(["active", "archived"]) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class UpdateProjectMemberRoleDto {
  @IsIn(["owner", "admin", "member"]) role: string;
}
