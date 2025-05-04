import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StockImagesService } from './stock-images.service';
import { CreateStockImageDto, SearchStockImageDto } from './dto';
import { FetchStockImagesDto } from './dto/fetch-stock-images.dto';

@Controller('stock-images')
export class StockImagesController {
  constructor(private readonly stockImagesService: StockImagesService) {}

  @Post()
  create(@Body() createStockImageDto: CreateStockImageDto) {
    return this.stockImagesService.create(createStockImageDto);
  }

  @Get('search')
  search(@Query() searchDto: SearchStockImageDto) {
    return this.stockImagesService.search(searchDto);
  }

  @Get()
  fetchAll(@Query() fetchDto: FetchStockImagesDto) {
    return this.stockImagesService.fetchAll(fetchDto);
  }
}
