import { Module } from '@nestjs/common';
import { StockImagesController } from './stock-images.controller';
import { StockImagesService } from './stock-images.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockImagesController],
  providers: [StockImagesService],
  exports: [StockImagesService],
})
export class StockImagesModule {}
