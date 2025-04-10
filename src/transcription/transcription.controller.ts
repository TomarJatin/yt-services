import { Controller, Post, Body } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { TranscribeRequestDto } from './dto/transcribe-request.dto';
import { TranscribeResponseDto } from './dto/transcribe-response.dto';

@Controller('transcription')
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post()
  async transcribe(
    @Body() request: TranscribeRequestDto,
  ): Promise<TranscribeResponseDto> {
    return await this.transcriptionService.transcribeAudio(request.audioUrl);
  }
}
