import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStockClipDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsNotEmpty()
  @IsString()
  genre: string;

  @IsNotEmpty()
  @IsString()
  duration: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
