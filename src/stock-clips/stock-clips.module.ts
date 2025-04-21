import { Module } from '@nestjs/common';
import { StockClipsController } from './stock-clips.controller';
import { StockClipsService } from './stock-clips.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockClipsController],
  providers: [StockClipsService],
  exports: [StockClipsService],
})
export class StockClipsModule {}
