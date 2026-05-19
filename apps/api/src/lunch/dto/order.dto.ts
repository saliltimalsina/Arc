import { IsString, IsOptional, IsDateString, IsObject, MaxLength } from "class-validator";

export class CreateOrderDto {
  @IsDateString() date: string;
  @IsString() mealId: string;
  @IsOptional() @IsObject() addons?: Record<string, number>;
  @IsOptional() @IsString() onBehalfOfUserId?: string;
  @IsOptional() @IsString() @MaxLength(200) notes?: string;
}

export class UpdateOrderDto {
  @IsOptional() @IsString() mealId?: string;
  @IsOptional() @IsObject() addons?: Record<string, number>;
  @IsOptional() @IsString() @MaxLength(200) notes?: string;
}
