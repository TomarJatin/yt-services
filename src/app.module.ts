import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TranscriptionModule } from './transcription/transcription.module';
import { PrismaModule } from './prisma/prisma.module';
import { StockClipsModule } from './stock-clips/stock-clips.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TranscriptionModule,
    PrismaModule,
    StockClipsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
