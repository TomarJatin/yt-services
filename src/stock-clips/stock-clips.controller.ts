import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { StockClipsService } from './stock-clips.service';
import { CreateStockClipDto, SearchStockClipDto } from './dto';
import { FetchStockClipsDto } from './dto/fetch-stock-clips.dto';

@Controller('stock-clips')
export class StockClipsController {
  constructor(private readonly stockClipsService: StockClipsService) {}

  @Post()
  create(@Body() createStockClipDto: CreateStockClipDto) {
    return this.stockClipsService.create(createStockClipDto);
  }

  @Get('search')
  search(@Query() searchDto: SearchStockClipDto) {
    return this.stockClipsService.search(searchDto);
  }

  @Get()
  fetchAll(@Query() fetchDto: FetchStockClipsDto) {
    return this.stockClipsService.fetchAll(fetchDto);
  }
}
