import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStockImageDto {
  @IsString()
  @IsNotEmpty()
  channel_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
