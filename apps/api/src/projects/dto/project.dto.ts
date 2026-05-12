import { IsString, IsOptional, IsIn } from "class-validator";

export class CreateProjectDto {
  @IsString() name: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() client?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() client?: string;
  @IsOptional() @IsIn(["active", "archived"]) status?: string;
  @IsOptional() @IsString() description?: string;
}
