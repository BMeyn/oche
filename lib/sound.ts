export type SoundName = "bust" | "leg-won" | "match-won" | "oneeighty";

const FILES: Record<SoundName, string> = {
  bust: "/sounds/bust.wav",
  "leg-won": "/sounds/gameshot.wav",
  "match-won": "/sounds/match.wav",
  oneeighty: "/sounds/oneeighty.wav",
};

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
const STORAGE_KEY = "oche.sound";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "on";
}

export function setSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
}

export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;
  try {
    let audio = cache[name];
    if (!audio) {
      audio = new Audio(FILES[name]);
      audio.preload = "auto";
      audio.volume = 0.6;
      cache[name] = audio;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    // ignore — autoplay rejection before first gesture, or transient errors
  }
}
