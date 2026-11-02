// Compõe faixas originais em estilo 8-bit para public/music: node scripts/generate-demo-music.mjs
// shortcut: usa o afconvert do macOS para gerar AAC; em outro sistema, troque pelo ffmpeg.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RATE = 22050;
const SCALES = { maior: [0, 2, 4, 5, 7, 9, 11], menor: [0, 2, 3, 5, 7, 8, 10] };

const TRACKS = [
  { file: "tela-de-titulo", seed: 11, root: 60, scale: "maior", bpm: 132, chords: [0, 4, 5, 3] },
  { file: "floresta-pixel", seed: 23, root: 62, scale: "maior", bpm: 118, chords: [0, 3, 4, 0] },
  { file: "corrida-neon", seed: 37, root: 57, scale: "menor", bpm: 156, chords: [0, 5, 2, 6] },
  { file: "castelo-noturno", seed: 41, root: 55, scale: "menor", bpm: 108, chords: [0, 3, 5, 4] },
  { file: "mar-de-bits", seed: 53, root: 65, scale: "maior", bpm: 100, chords: [0, 5, 3, 4] },
  { file: "chefao-final", seed: 67, root: 52, scale: "menor", bpm: 168, chords: [0, 6, 5, 4] },
];
// Cada letra é uma seção de 16 compassos; repetir A dá o refrão.
const FORM = ["A", "A", "B", "A", "C", "A"];

function random(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const hertz = (note) => 440 * 2 ** ((note - 69) / 12);

function degree(track, step) {
  const scale = SCALES[track.scale];
  const octave = Math.floor(step / scale.length);
  return track.root + octave * 12 + scale[((step % scale.length) + scale.length) % scale.length];
}

/** Melodia em colcheias: tempo forte no acorde, o resto caminha pela escala. */
function melody(track, rand, bars, density) {
  const notes = [];
  let step = 7;
  for (let bar = 0; bar < bars; bar++) {
    const chord = track.chords[bar % track.chords.length];
    for (let eighth = 0; eighth < 8; eighth++) {
      if (eighth % 4 === 0) step = chord + 7 + [0, 2, 4][Math.floor(rand() * 3)];
      else if (rand() < density) step += [-2, -1, 1, 2][Math.floor(rand() * 4)];
      else {
        notes.push(null);
        continue;
      }
      step = Math.min(16, Math.max(3, step));
      notes.push(degree(track, step));
    }
  }
  return notes;
}

function compose(track) {
  const rand = random(track.seed);
  const sections = {
    A: melody(track, rand, 4, 0.8),
    B: melody(track, rand, 4, 0.55),
    C: melody(track, rand, 4, 0.92),
  };
  const eighth = 30 / track.bpm;
  const events = [];
  let bar = 0;
  for (const name of FORM) {
    for (let repeat = 0; repeat < 4; repeat++) {
      sections[name].forEach((note, i) => {
        // A última passada do bloco varia uma oitava para não soar em laço.
        const lift = repeat === 3 && i >= 24 ? 12 : 0;
        if (note) events.push({ type: "lead", at: (bar * 8 + i) * eighth, length: eighth * 0.9, note: note + lift });
      });
      for (let b = 0; b < 4; b++) {
        const chord = track.chords[b % track.chords.length];
        const start = (bar + b) * 8 * eighth;
        const tones = [0, 2, 4].map((offset) => degree(track, chord + offset));
        for (let i = 0; i < 16; i++) {
          events.push({
            type: "arp",
            at: start + (i * eighth) / 2,
            length: eighth / 2,
            note: tones[i % 3] + 12,
          });
        }
        for (let i = 0; i < 8; i++) {
          const octave = i % 2 ? 12 : 0;
          events.push({ type: "bass", at: start + i * eighth, length: eighth * 0.9, note: degree(track, chord) - 24 + octave });
          if (name === "B" && i % 4) continue;
          events.push({ type: i % 4 === 2 ? "snare" : i % 2 ? "hat" : "kick", at: start + i * eighth, length: eighth / 2 });
        }
      }
      bar += 4;
    }
  }
  return { events, duration: bar * 8 * eighth + 1 };
}

function render(track) {
  const { events, duration } = compose(track);
  const samples = new Float32Array(Math.ceil(duration * RATE));
  const noise = random(track.seed + 1);
  const voices = { lead: [0.25, 0.2], arp: [0.5, 0.07] };

  for (const event of events) {
    const start = Math.floor(event.at * RATE);
    const count = Math.floor(event.length * RATE);
    const freq = event.note ? hertz(event.note) : 0;
    for (let i = 0; i < count && start + i < samples.length; i++) {
      const t = i / RATE;
      const fade = 1 - i / count;
      let value = 0;
      if (event.type in voices) {
        const [duty, gain] = voices[event.type];
        // Vibrato leve na melodia, como nos chips da época.
        const vibrato = event.type === "lead" ? 1 + 0.004 * Math.sin(2 * Math.PI * 6 * t) : 1;
        value = ((t * freq * vibrato) % 1 < duty ? 1 : -1) * gain * Math.sqrt(fade);
      } else if (event.type === "bass") {
        const phase = (t * freq) % 1;
        value = (4 * Math.abs(phase - 0.5) - 1) * 0.3;
      } else if (event.type === "kick") {
        value = Math.sin(2 * Math.PI * (70 + 120 * fade) * t) * 0.32 * fade;
      } else {
        value = (noise() * 2 - 1) * (event.type === "snare" ? 0.16 : 0.05) * fade ** 3;
      }
      samples[start + i] += value;
    }
  }

  const fadeOut = Math.floor(RATE * 2.5);
  for (let i = 0; i < fadeOut; i++) samples[samples.length - 1 - i] *= i / fadeOut;
  return samples;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((sample, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync("public/music", { recursive: true });
for (const track of TRACKS) {
  const temp = join(tmpdir(), `${track.file}.wav`);
  writeFileSync(temp, wav(render(track)));
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "56000", temp, `public/music/${track.file}.m4a`]);
  rmSync(temp);
}
