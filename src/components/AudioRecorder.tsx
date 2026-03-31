import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Trash2, Check } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
}

type RecorderState = 'idle' | 'recording' | 'recorded';
type RecorderBackend = 'opus' | 'native' | null;

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const backendRef = useRef<RecorderBackend>(null);
  const opusRecorderRef = useRef<any>(null);
  const nativeRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<any[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (opusRecorderRef.current) {
      try { opusRecorderRef.current.close(); } catch {}
      opusRecorderRef.current = null;
    }
    nativeRecorderRef.current = null;
    backendRef.current = null;
  }, []);

  const handleBlobReady = useCallback((blob: Blob, mimeType: string) => {
    console.log('[AudioRecorder] Blob ready, size:', blob.size, 'type:', mimeType);
    if (blob.size < 100) {
      console.warn('[AudioRecorder] Blob too small, discarding');
      setState('idle');
      return;
    }
    blobRef.current = blob;
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setState('recorded');
  }, []);

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startWithNative = useCallback(async () => {
    console.log('[AudioRecorder] Starting native MediaRecorder fallback');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                 MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    }
    console.log('[AudioRecorder] Native mimeType:', mimeType);

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stopTimer();
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      handleBlobReady(blob, recorder.mimeType);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };

    nativeRecorderRef.current = recorder;
    backendRef.current = 'native';
    recorder.start(1000);
    setState('recording');
    startTimer();
  }, [handleBlobReady, startTimer, stopTimer]);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;

    // Try opus-recorder first
    try {
      const [{ default: Recorder }, { default: workerUrl }] = await Promise.all([
        import('opus-recorder'),
        import('opus-recorder/dist/encoderWorker.min.js?url'),
      ]);

      console.log('[AudioRecorder] Trying opus-recorder, worker:', workerUrl);

      const recorder = new Recorder({
        encoderPath: workerUrl,
        encoderApplication: 2049,
        encoderSampleRate: 48000,
        encoderBitRate: 48000,
        streamPages: true,
        numberOfChannels: 1,
      });

      recorder.ondataavailable = (data: Uint8Array) => {
        chunksRef.current.push(data);
      };

      recorder.onstop = () => {
        stopTimer();
        const blob = new Blob(chunksRef.current as BlobPart[], { type: 'audio/ogg; codecs=opus' });
        handleBlobReady(blob, 'audio/ogg; codecs=opus');
      };

      opusRecorderRef.current = recorder;
      backendRef.current = 'opus';
      await recorder.start();
      console.log('[AudioRecorder] opus-recorder started OK');
      setState('recording');
      startTimer();
    } catch (err) {
      console.warn('[AudioRecorder] opus-recorder failed, falling back to native:', err);
      cleanup();
      try {
        await startWithNative();
      } catch (nativeErr) {
        console.error('[AudioRecorder] Native MediaRecorder also failed:', nativeErr);
        setState('idle');
      }
    }
  }, [audioUrl, cleanup, handleBlobReady, startTimer, stopTimer, startWithNative]);

  const stopRecording = useCallback(async () => {
    stopTimer();
    if (backendRef.current === 'opus' && opusRecorderRef.current) {
      await opusRecorderRef.current.stop();
    } else if (backendRef.current === 'native' && nativeRecorderRef.current) {
      nativeRecorderRef.current.stop();
    }
  }, [stopTimer]);

  const discard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
    setState('idle');
    cleanup();
  }, [audioUrl, cleanup]);

  const confirm = useCallback(() => {
    if (!blobRef.current) return;
    const ext = blobRef.current.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blobRef.current], `audio_${Date.now()}.${ext}`, { type: blobRef.current.type });
    onRecordingComplete(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
    setState('idle');
    cleanup();
  }, [audioUrl, onRecordingComplete, cleanup]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="rounded-xl bg-card border p-5 space-y-4">
      <p className="font-semibold text-sm">🎙️ Gravar Áudio</p>

      {state === 'idle' && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-16 w-16 rounded-full border-2 hover:border-destructive hover:text-destructive transition-colors"
            onClick={startRecording}
          >
            <Mic className="h-7 w-7" />
          </Button>
        </div>
      )}

      {state === 'recording' && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full animate-pulse"
              onClick={stopRecording}
            >
              <Square className="h-6 w-6" />
            </Button>
            <span className="text-lg font-mono font-semibold tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Gravando... clique para parar</p>
        </div>
      )}

      {state === 'recorded' && audioUrl && (
        <div className="space-y-3">
          <audio controls src={audioUrl} className="w-full" />
          <div className="flex gap-2 justify-center">
            <Button type="button" variant="outline" onClick={discard} className="gap-2">
              <Trash2 className="h-4 w-4" /> Descartar
            </Button>
            <Button type="button" onClick={confirm} className="gap-2">
              <Check className="h-4 w-4" /> Confirmar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
