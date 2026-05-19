import { IsString, IsInt, Min, IsIn, MaxLength, IsOptional } from "class-validator";

export class TopupDto {
  @IsInt() @Min(1) amountMinor: number;
  @IsIn(["esewa", "khalti", "manual"]) provider: string;
  @IsOptional() @IsString() @MaxLength(120) externalRef?: string;
}

export class CutoffDto {
  @IsInt() @Min(0) cutoffHour: number;
  @IsInt() @Min(0) cutoffMinute: number;
  @IsOptional() @IsInt() @Min(0) gracePeriodMinutes?: number;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

export class SuggestionDto {
  @IsString() @MaxLength(40) category: string;
  @IsString() @MaxLength(2000) body: string;
}
