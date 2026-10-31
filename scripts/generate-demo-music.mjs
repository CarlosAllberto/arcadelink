// Gera faixas originais em onda quadrada para public/music: node scripts/generate-demo-music.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const RATE = 11025;
const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25 };

function render(melody, bass, step) {
  const samples = [];
  const length = Math.floor(RATE * step);
  melody.forEach((name, i) => {
    const freq = NOTE[name];
    const low = NOTE[bass[Math.floor(i / 4) % bass.length]] / 2;
    for (let n = 0; n < length; n++) {
      const t = n / RATE;
      const envelope = 1 - n / length / 2;
      const lead = freq && Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
      const back = Math.sin(2 * Math.PI * low * t) > 0 ? 1 : -1;
      samples.push(128 + Math.round((freq ? lead * 34 * envelope : 0) + back * 16));
    }
  });
  return Buffer.from(samples);
}

function wav(data) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const a = "C5 E5 G4 E5 D5 C5 A4 G4 A4 C5 E5 D5 C5 A4 G4 E4".split(" ");
const b = "E4 G4 A4 G4 C5 A4 G4 E4 D4 E4 G4 A4 G4 E4 D4 C4".split(" ");

mkdirSync("public/music", { recursive: true });
writeFileSync("public/music/demo-1.wav", wav(render([...a, ...a, ...b, ...a], ["C4", "A4", "D4", "G4"], 0.2)));
writeFileSync("public/music/demo-2.wav", wav(render([...b, ...b, ...a, ...b], ["A4", "E4", "D4", "E4"], 0.24)));
