// Always-on counter listener for the Soundbox page. Runs voice-activity detection in the browser and hands back
// one 16 kHz mono WAV per utterance (cut on ~0.9 s of silence, capped at 25 s to stay under Sarvam's 30 s limit).
// Nothing is recorded to disk; a segment exists only long enough to be sent for transcription.

export type Listener = { stop: () => void; pause: (on: boolean) => void };
type Opts = { onSegment: (wav: Blob, seconds: number) => void; onLevel?: (level: number, speaking: boolean) => void };

export function encodeWav(pcm: Float32Array, rate: number): Blob {
  const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  out.setUint32(4, 36 + pcm.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, rate, true);
  out.setUint32(28, rate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  w(36, "data");
  out.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    out.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([out], { type: "audio/wav" });
}

function downsample(input: Float32Array, from: number, to = 16000): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio), b = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = a; j < b; j++) sum += input[j];
    out[i] = sum / Math.max(1, b - a);
  }
  return out;
}

export async function startListening({ onSegment, onLevel }: Opts): Promise<Listener> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot use the microphone.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true, autoGainControl: true } });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(2048, 1, 1);
  const frameS = 2048 / ctx.sampleRate;
  const PRE = 8, HANG = Math.round(0.9 / frameS), MAX = Math.round(25 / frameS), MIN_VOICED = Math.round(0.7 / frameS);
  let noise = 0.008, speaking = false, paused = false, silent = 0, voiced = 0, above = 0;
  let pre: Float32Array[] = [], seg: Float32Array[] = [];

  const flush = () => {
    if (voiced >= MIN_VOICED) {
      const total = seg.reduce((n, f) => n + f.length, 0);
      const all = new Float32Array(total);
      let o = 0;
      for (const f of seg) { all.set(f, o); o += f.length; }
      onSegment(encodeWav(downsample(all, ctx.sampleRate), 16000), total / ctx.sampleRate);
    }
    speaking = false; seg = []; voiced = 0; silent = 0; above = 0;
  };

  node.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
    const rms = Math.sqrt(sum / d.length);
    if (paused) { onLevel?.(0, false); return; }
    const threshold = Math.max(0.014, noise * 3.2);
    const loud = rms > threshold;
    if (!speaking) {
      noise = noise * 0.95 + rms * 0.05; // track room noise while idle
      pre.push(new Float32Array(d));
      if (pre.length > PRE) pre.shift();
      above = loud ? above + 1 : 0;
      if (above >= 2) { speaking = true; seg = pre; pre = []; voiced = above; silent = 0; }
    } else {
      seg.push(new Float32Array(d));
      if (loud) { voiced++; silent = 0; } else silent++;
      if (silent >= HANG || seg.length >= MAX) flush();
    }
    onLevel?.(Math.min(1, rms / 0.12), speaking);
  };
  src.connect(node);
  node.connect(ctx.destination); // required for onaudioprocess to fire; output buffer stays silent
  return {
    pause: (on) => { paused = on; if (on) { speaking = false; seg = []; pre = []; voiced = 0; above = 0; } },
    stop: () => { node.disconnect(); src.disconnect(); stream.getTracks().forEach((t) => t.stop()); void ctx.close(); },
  };
}
