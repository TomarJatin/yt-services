import { IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class SearchStockClipDto {
  @IsNotEmpty()
  @IsString()
  query: string;

  @IsOptional()
  @IsPositive()
  limit?: number;

  @IsOptional()
  @IsString()
  genre?: string;
}
