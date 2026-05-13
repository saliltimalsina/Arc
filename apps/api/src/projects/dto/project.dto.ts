import { IsString, IsOptional, IsIn, IsDateString, IsInt } from "class-validator";

export class AddProjectMemberDto {
  @IsString() email: string;
  @IsOptional() @IsIn(["admin", "member"]) role?: string;
}

export class CreateProjectDto {
  @IsString() name: string;
  @IsOptional() @IsString() key?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() client?: string;
  @IsOptional() @IsString() description?: string;
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
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() client?: string;
  @IsOptional() @IsIn(["active", "archived"]) status?: string;
  @IsOptional() @IsString() description?: string;
}
