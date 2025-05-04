import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchStockImageDto {
  @IsString()
  @IsNotEmpty()
  channel_id: string;

  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
