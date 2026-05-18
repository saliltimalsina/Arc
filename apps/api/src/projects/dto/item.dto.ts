import { IsString, IsOptional, IsIn, IsInt, Min, ValidateIf, IsDateString } from "class-validator";

export class CreateItemDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(["story", "task", "bug", "subtask"]) type?: string;
  @IsOptional() @IsIn(["To Do", "In Progress", "In Review", "Done"]) status?: string;
  @IsOptional() @IsIn(["trivial", "low", "medium", "high", "urgent"]) priority?: string;
  @IsOptional() @IsInt() @Min(0) points?: number;
  @IsOptional() @IsString() sprintId?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateItemDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(["story", "task", "bug", "subtask"]) type?: string;
  @IsOptional() @IsIn(["To Do", "In Progress", "In Review", "Done"]) status?: string;
  @IsOptional() @IsIn(["trivial", "low", "medium", "high", "urgent"]) priority?: string;
  @IsOptional() @IsInt() @Min(0) points?: number;
  @IsOptional() @ValidateIf(o => o.sprintId !== null) @IsString() sprintId?: string | null;
  @IsOptional() @IsInt() @Min(0) position?: number;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @ValidateIf(o => o.reporterId !== null) @IsString() reporterId?: string | null;
}

export class SetAssigneeDto {
  @IsOptional() @ValidateIf(o => o.userId !== null) @IsString() userId?: string | null;
}

export class CreateCommentDto {
  @IsString() body: string;
}
