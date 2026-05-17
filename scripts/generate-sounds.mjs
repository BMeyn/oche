#!/usr/bin/env node
// One-off synthesizer for the 4 match-moment WAV files.
// Run: node scripts/generate-sounds.mjs
//
// Writes mono 16-bit PCM at 22050 Hz into public/sounds/.
// Re-run any time to tweak the tones; output files are committed.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 22050;
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "sounds");
mkdirSync(OUT_DIR, { recursive: true });

// ── WAV writer ──────────────────────────────────────────────────────────────
function writeWav(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SR * 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  let o = 0;
  buffer.write("RIFF", o); o += 4;
  buffer.writeUInt32LE(36 + dataSize, o); o += 4;
  buffer.write("WAVE", o); o += 4;
  buffer.write("fmt ", o); o += 4;
  buffer.writeUInt32LE(16, o); o += 4;        // PCM chunk size
  buffer.writeUInt16LE(1, o); o += 2;          // PCM format
  buffer.writeUInt16LE(1, o); o += 2;          // mono
  buffer.writeUInt32LE(SR, o); o += 4;         // sample rate
  buffer.writeUInt32LE(byteRate, o); o += 4;
  buffer.writeUInt16LE(2, o); o += 2;          // block align
  buffer.writeUInt16LE(16, o); o += 2;         // bits/sample
  buffer.write("data", o); o += 4;
  buffer.writeUInt32LE(dataSize, o); o += 4;
  for (let i = 0; i < numSamples; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), o);
    o += 2;
  }
  writeFileSync(filename, buffer);
  console.log(`✓ ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

// ── Envelope + tone helpers ─────────────────────────────────────────────────
const TAU = Math.PI * 2;

// ADSR-ish exponential decay envelope
function env(t, dur, attack = 0.005, release = 0.05) {
  if (t < 0 || t > dur) return 0;
  if (t < attack) return t / attack;
  const releaseStart = dur - release;
  if (t > releaseStart) return Math.max(0, 1 - (t - releaseStart) / release);
  return 1;
}

// Exponential decay (good for percussive sounds)
function expDecay(t, dur, tau = 0.15) {
  if (t < 0 || t > dur) return 0;
  return Math.exp(-t / tau);
}

function sine(freq, t) { return Math.sin(TAU * freq * t); }
function tri(freq, t) {
  const p = (freq * t) % 1;
  return 4 * Math.abs(p - 0.5) - 1;
}

// ── 1. BUST: low sweep "thunk" ──────────────────────────────────────────────
function makeBust() {
  const dur = 0.25;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = 220 - (140 * t / dur); // 220 → 80 Hz
    const e = expDecay(t, dur, 0.08);
    out[i] = (sine(freq, t) * 0.7 + sine(freq * 0.5, t) * 0.3) * e * 0.85;
  }
  return out;
}

// ── 2. GAMESHOT: ascending two-note chime ───────────────────────────────────
function makeGameshot() {
  const dur = 0.55;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // First note 0..0.55, second note kicks in at 0.12
    const note1 = sine(660, t) * expDecay(t, dur, 0.28);
    const note2Start = 0.12;
    const note2 = t < note2Start
      ? 0
      : sine(990, t - note2Start) * expDecay(t - note2Start, dur - note2Start, 0.28);
    const e = env(t, dur, 0.01, 0.08);
    out[i] = (note1 * 0.55 + note2 * 0.55) * e * 0.7;
  }
  return out;
}

// ── 3. MATCH: triumphant 3-note arpeggio ────────────────────────────────────
function makeMatch() {
  const dur = 0.95;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  const notes = [
    { f: 523.25, start: 0.00 }, // C5
    { f: 783.99, start: 0.16 }, // G5
    { f: 1174.66, start: 0.32 }, // D6
  ];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (const note of notes) {
      if (t < note.start) continue;
      const lt = t - note.start;
      const lifetime = dur - note.start;
      // Slight detune for warmth
      const tone = sine(note.f, lt) * 0.55 + sine(note.f * 1.005, lt) * 0.35;
      s += tone * expDecay(lt, lifetime, 0.35);
    }
    // Sub layer
    s += sine(130.81, t) * expDecay(t, dur, 0.45) * 0.2; // C3 sub
    const e = env(t, dur, 0.005, 0.1);
    out[i] = Math.max(-1, Math.min(1, s * e * 0.45));
  }
  return out;
}

// ── 4. ONEEIGHTY: rapid triple-pulse rising fanfare ─────────────────────────
function makeOneeighty() {
  const dur = 0.65;
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  const pulses = [
    { f: 880, start: 0.00, len: 0.18 },
    { f: 1100, start: 0.18, len: 0.18 },
    { f: 1320, start: 0.36, len: 0.29 },
  ];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (const p of pulses) {
      if (t < p.start || t > p.start + p.len) continue;
      const lt = t - p.start;
      // Triangle for brassier tone, sine layer for body
      s += (tri(p.f, lt) * 0.35 + sine(p.f, lt) * 0.6) * expDecay(lt, p.len, 0.10);
    }
    const e = env(t, dur, 0.005, 0.06);
    out[i] = s * e * 0.55;
  }
  return out;
}

// ── Run ─────────────────────────────────────────────────────────────────────
writeWav(resolve(OUT_DIR, "bust.wav"), makeBust());
writeWav(resolve(OUT_DIR, "gameshot.wav"), makeGameshot());
writeWav(resolve(OUT_DIR, "match.wav"), makeMatch());
writeWav(resolve(OUT_DIR, "oneeighty.wav"), makeOneeighty());
console.log("\nDone. Files written to public/sounds/");
