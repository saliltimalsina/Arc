import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class CursorPaginationDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
}

export function paginate<T extends { id: string }>(rows: T[], limit: number): CursorPage<T> {
  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  return {
    data: trimmed,
    nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null,
  };
}

export function resolveTake(limit?: number, fallback = 50) {
  return Math.min(Math.max(limit ?? fallback, 1), 100);
}
