declare module 'opus-recorder' {
  interface RecorderConfig {
    encoderPath?: string;
    encoderApplication?: number;
    encoderSampleRate?: number;
    encoderBitRate?: number;
    encoderFrameSize?: number;
    maxFramesPerPage?: number;
    numberOfChannels?: number;
    streamPages?: boolean;
    bufferLength?: number;
    monitorGain?: number;
    recordingGain?: number;
    mediaTrackConstraints?: boolean | MediaTrackConstraints;
    resampleQuality?: number;
    wavBitDepth?: number;
    sourceNode?: { context: AudioContext | null };
  }

  class Recorder {
    constructor(config?: RecorderConfig);
    static isRecordingSupported(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    pause(flush?: boolean): Promise<void>;
    resume(): void;
    close(): Promise<void>;
    setRecordingGain(gain: number): void;
    setMonitorGain(gain: number): void;
    ondataavailable: (data: Uint8Array) => void;
    onstop: () => void;
    onstart: () => void;
    onpause: () => void;
    onresume: () => void;
    state: string;
    encodedSamplePosition: number;
  }

  export default Recorder;
}

declare module 'opus-recorder/dist/encoderWorker.min.js?url' {
  const url: string;
  export default url;
}
