import { Injectable, OnModuleInit } from '@nestjs/common';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  convertToCaptions,
} from '@remotion/install-whisper-cpp';

const execAsync = promisify(exec);

interface WhisperCaption {
  text: string;
  startInSeconds: number;
}

interface FormattedCaption {
  text: string;
  startMs: number;
  endMs: number;
}

@Injectable()
export class TranscriptionService implements OnModuleInit {
  private readonly WHISPER_DIR = path.join(process.cwd(), 'whisper.cpp');
  private readonly MODEL_NAME = 'medium.en';
  private readonly MODEL_PATH = path.join(
    this.WHISPER_DIR,
    `models/ggml-${this.MODEL_NAME}.bin`,
  );
  private readonly MODEL_EXPECTED_SIZE = 1533774781; // Size in bytes for medium.en model
  private readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  private readonly TMP_JSON_PATH = path.join(process.cwd(), 'tmp.json');

  async onModuleInit() {
    // Initialize Whisper on service startup
    await this.initializeWhisper();
  }

  private async initializeWhisper() {
    await fs.mkdir(this.TEMP_DIR, { recursive: true });

    // Install Whisper.cpp if not present
    try {
      await fs.access(path.join(this.WHISPER_DIR, 'main'));
    } catch {
      console.log('Installing Whisper.cpp...');
      await installWhisperCpp({
        to: this.WHISPER_DIR,
        version: '1.5.5',
      });
    }

    // Check model file existence and size
    let needsModelDownload = true;
    try {
      const stats = await fs.stat(this.MODEL_PATH);
      if (stats.size === this.MODEL_EXPECTED_SIZE) {
        console.log('Whisper model already exists and has correct size.');
        needsModelDownload = false;
      } else {
        console.log(
          'Whisper model exists but has incorrect size. Redownloading...',
        );
        await fs.unlink(this.MODEL_PATH);
      }
    } catch {
      console.log('Whisper model not found. Downloading...');
    }

    // Download model if needed
    if (needsModelDownload) {
      await downloadWhisperModel({
        model: this.MODEL_NAME,
        folder: this.WHISPER_DIR,
      });
    }

    await fs.writeFile(this.TMP_JSON_PATH, '{}');
  }

  private async safeDeleteFile(filePath: string) {
    try {
      const fileStats = await fs.stat(filePath);
      if (!fileStats.isFile()) return;
      await fs.unlink(filePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if (error.code !== 'ENOENT') {
          console.warn(`Error deleting file ${filePath}:`, error.message);
        }
      }
    }
  }

  private formatCaptionsForRemotion(captions: WhisperCaption[]) {
    const lastCaption = captions[captions.length - 1];
    const totalDurationInSeconds = lastCaption.startInSeconds + 2;
    const firstStartTime = captions.length > 0 ? captions[0].startInSeconds : 0;

    const formattedCaptions: FormattedCaption[] = captions.map(
      (caption, index) => {
        const startMs = Math.round(
          (caption.startInSeconds - firstStartTime) * 1000,
        );
        const nextCaption = captions[index + 1];
        const endMs = nextCaption
          ? Math.round((nextCaption.startInSeconds - firstStartTime) * 1000)
          : Math.round((caption.startInSeconds - firstStartTime + 1) * 1000);

        return { text: caption.text, startMs, endMs };
      },
    );

    return {
      captions: formattedCaptions,
      durationInSeconds: totalDurationInSeconds,
      durationInFrames: Math.ceil(totalDurationInSeconds * 30),
    };
  }

  async transcribeAudio(audioUrl: string) {
    const tempFiles = ['input.mp3', 'input.wav'];

    // Clean up existing temp files
    for (const file of tempFiles) {
      await this.safeDeleteFile(path.join(this.TEMP_DIR, file));
    }

    // Download and save audio
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    const tempAudioPath = path.join(this.TEMP_DIR, 'input.mp3');
    const tempWavPath = path.join(this.TEMP_DIR, 'input.wav');

    await fs.writeFile(tempAudioPath, Buffer.from(audioBuffer));

    // Convert to WAV
    await execAsync(
      `ffmpeg -i "${tempAudioPath}" -ar 16000 -ac 1 "${tempWavPath}" -y`,
    );

    // Transcribe
    const { transcription } = await transcribe({
      model: this.MODEL_NAME,
      whisperPath: this.WHISPER_DIR,
      whisperCppVersion: '1.5.5',
      inputPath: tempWavPath,
      tokenLevelTimestamps: true,
    });

    // Convert to captions
    const { captions } = convertToCaptions({
      transcription,
      combineTokensWithinMilliseconds: 200,
    });

    // Format and return
    const result = this.formatCaptionsForRemotion(captions);

    // Cleanup
    for (const file of tempFiles) {
      await this.safeDeleteFile(path.join(this.TEMP_DIR, file));
    }

    return result;
  }
}
