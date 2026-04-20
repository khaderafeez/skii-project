import { useEffect, useState } from 'react';

const resolveTrackUrl = (fileName: string) =>
  new URL(`${import.meta.env.BASE_URL}${fileName}`, window.location.origin).toString();

const AUDIO_TRACKS: Record<string, string> = {
  Grounding: resolveTrackUrl('audio/grounding/grounding.wav'),
  Calming: resolveTrackUrl('audio/calming/calming.wav'),
  Restorative: resolveTrackUrl('audio/restorative/restorative.wav'),
  Uplifting: resolveTrackUrl('audio/uplifting/uplifting.wav'),
};

const globalAudio = new Audio();
globalAudio.loop = true;
globalAudio.preload = 'auto';
globalAudio.playsInline = true;

let audioUnlocked = false;
let unlockPromise: Promise<boolean> | null = null;

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const resetAudioElement = (clearSource = false) => {
  globalAudio.pause();
  globalAudio.currentTime = 0;
  globalAudio.volume = 1;
  globalAudio.muted = false;

  if (clearSource) {
    globalAudio.removeAttribute('src');
    globalAudio.load();
  }
};

const createSilentWavUrl = (durationMs = 250) => {
  const sampleRate = 44100;
  const channelCount = 1;
  const bitsPerSample = 16;
  const frameCount = Math.max(1, Math.round((sampleRate * durationMs) / 1000));
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = frameCount * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

export const unlockAudioEngine = () => {
  if (audioUnlocked) {
    return Promise.resolve(true);
  }

  if (unlockPromise) {
    return unlockPromise;
  }

  unlockPromise = (async () => {
    const unlockUrl = createSilentWavUrl();

    globalAudio.loop = false;
    globalAudio.src = unlockUrl;
    globalAudio.currentTime = 0;
    globalAudio.volume = 0;
    globalAudio.muted = true;

    try {
      await globalAudio.play();
      resetAudioElement(true);
      globalAudio.loop = true;
      audioUnlocked = true;
      console.log('[Audio Engine] Global audio unlocked via user gesture.');
      return true;
    } catch (error) {
      resetAudioElement(true);
      globalAudio.loop = true;
      console.warn('[Audio Engine] Unlock failed. Browser still blocking.', error);
      return false;
    } finally {
      URL.revokeObjectURL(unlockUrl);
      unlockPromise = null;
    }
  })();

  return unlockPromise;
};

export function useAudioTherapy(activeCategory: string | null) {
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncAudio = async () => {
      if (!activeCategory) {
        if (unlockPromise) {
          await unlockPromise;

          if (cancelled) {
            return;
          }
        }

        resetAudioElement(true);
        setCurrentPlaying(null);
        return;
      }

      const targetTrack = AUDIO_TRACKS[activeCategory];
      if (!targetTrack) {
        setCurrentPlaying(null);
        return;
      }

      if (unlockPromise) {
        const unlocked = await unlockPromise;
        if (!unlocked || cancelled) {
          if (!cancelled) {
            setCurrentPlaying(null);
          }
          return;
        }
      }

      if (!audioUnlocked) {
        console.warn('[Audio Engine] Playback skipped because the audio engine was never unlocked from a user gesture.');
        setCurrentPlaying(null);
        return;
      }

      if (globalAudio.src !== targetTrack) {
        console.log(`[Audio Engine] Loading new track: ${activeCategory}`);
        globalAudio.src = targetTrack;
        globalAudio.currentTime = 0;
      }

      globalAudio.volume = 1;
      globalAudio.muted = false;

      try {
        await globalAudio.play();

        if (cancelled) {
          return;
        }

        console.log(`[Audio Engine] Playing ${activeCategory}.`);
        setCurrentPlaying(activeCategory);
      } catch (error) {
        if (cancelled || isAbortError(error)) {
          return;
        }

        console.error(`[Audio Engine] Playback failed for ${activeCategory}.`, error);
        setCurrentPlaying(null);
      }
    };

    void syncAudio();

    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const stopAudio = () => {
    resetAudioElement(true);
    setCurrentPlaying(null);
  };

  useEffect(() => {
    return () => {
      resetAudioElement(true);
    };
  }, []);

  return { currentPlaying, stopAudio };
}
