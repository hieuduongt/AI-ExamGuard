import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

const SOUND_URL = '/sounds/alert-warning.mp3';
const SOUND_PREF_KEY = 'examguard:proctor-sound:v1';

const prefListeners = new Set<() => void>();

function subscribeSoundPref(listener: () => void) {
  prefListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    prefListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readSoundPref() {
  return window.localStorage.getItem(SOUND_PREF_KEY) !== 'off';
}

function writeSoundPref(enabled: boolean) {
  window.localStorage.setItem(SOUND_PREF_KEY, enabled ? 'on' : 'off');
  prefListeners.forEach((listener) => listener());
}

// Warning buzz for new alerts on the teacher dashboard. On by default; the
// on/off choice is remembered per browser. Browsers may block audio until the
// page has been clicked once, so a blocked play is reported for the UI.
export function useAlertSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabled = useSyncExternalStore(subscribeSoundPref, readSoundPref, () => true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const audio = new Audio(SOUND_URL);
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !readSoundPref()) return;
    audio.currentTime = 0;
    audio.play().then(() => setBlocked(false), () => setBlocked(true));
  }, []);

  const onSoundButton = useCallback(() => {
    if (readSoundPref() && !blocked) {
      writeSoundPref(false);
      audioRef.current?.pause();
      return;
    }
    writeSoundPref(true);
    play();
  }, [blocked, play]);

  return { soundEnabled: enabled, soundBlocked: enabled && blocked, playAlertSound: play, onSoundButton };
}
