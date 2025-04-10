import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TranscriptionModule } from './transcription/transcription.module';

@Module({
  imports: [TranscriptionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
