import { IsString, IsOptional, IsIn, IsInt, Min, ValidateIf, IsDateString, MaxLength } from "class-validator";

export class CreateItemDto {
  @IsString() @MaxLength(300) title: string;
  @IsOptional() @IsString() @MaxLength(50_000) description?: string;
  @IsOptional() @IsIn(["story", "task", "bug", "subtask"]) type?: string;
  @IsOptional() @IsIn(["To Do", "In Progress", "In Review", "Done"]) status?: string;
  @IsOptional() @IsIn(["trivial", "low", "medium", "high", "urgent"]) priority?: string;
  @IsOptional() @IsInt() @Min(0) points?: number;
  @IsOptional() @IsString() sprintId?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @ValidateIf(o => o.dueDate !== null) @IsDateString() dueDate?: string | null;
}

export class UpdateItemDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(50_000) description?: string;
  @IsOptional() @IsIn(["story", "task", "bug", "subtask"]) type?: string;
  @IsOptional() @IsIn(["To Do", "In Progress", "In Review", "Done"]) status?: string;
  @IsOptional() @IsIn(["trivial", "low", "medium", "high", "urgent"]) priority?: string;
  @IsOptional() @IsInt() @Min(0) points?: number;
  @IsOptional() @ValidateIf(o => o.sprintId !== null) @IsString() sprintId?: string | null;
  @IsOptional() @IsInt() @Min(0) position?: number;
  @IsOptional() @ValidateIf(o => o.dueDate !== null) @IsDateString() dueDate?: string | null;
  @IsOptional() @ValidateIf(o => o.reporterId !== null) @IsString() reporterId?: string | null;
  @IsOptional() @ValidateIf(o => o.parentId !== null) @IsString() parentId?: string | null;
}

export class SetAssigneeDto {
  @IsOptional() @ValidateIf(o => o.userId !== null) @IsString() userId?: string | null;
}

export class CreateCommentDto {
  @IsString() @MaxLength(50_000) body: string;
}
