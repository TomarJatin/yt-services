interface Caption {
  text: string;
  startMs: number;
  endMs: number;
}

export class TranscribeResponseDto {
  captions: Caption[];
  durationInSeconds: number;
  durationInFrames: number;
}
