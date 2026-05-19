import { IsString, IsOptional, IsInt, Min, Max, MaxLength, IsArray, ArrayUnique, IsBoolean } from "class-validator";

export class CreateMealDto {
  @IsString() @MaxLength(40) key: string;
  @IsString() @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(8) emoji?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsInt() @Min(0) basePriceMinor: number;
  @IsOptional() @IsInt() @Min(0) kcal?: number;
  @IsOptional() @IsString() @MaxLength(40) dietary?: string;
  @IsArray() @ArrayUnique() availableDows: number[];
  @IsOptional() @IsString() @MaxLength(40) extraLabel?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateMealDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(8) emoji?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsInt() @Min(0) basePriceMinor?: number;
  @IsOptional() @IsInt() @Min(0) kcal?: number;
  @IsOptional() @IsString() @MaxLength(40) dietary?: string;
  @IsOptional() @IsArray() availableDows?: number[];
  @IsOptional() @IsString() @MaxLength(40) extraLabel?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateAddonDto {
  @IsOptional() @IsString() mealId?: string;
  @IsString() @MaxLength(40) key: string;
  @IsString() @MaxLength(80) name: string;
  @IsInt() @Min(0) unitPriceMinor: number;
  @IsInt() @Min(1) @Max(20) maxQty: number;
}
