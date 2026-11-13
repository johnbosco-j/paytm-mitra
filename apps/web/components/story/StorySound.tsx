"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { STEP_IDS, useStory } from "@/lib/story";

const VOICED = new Set(["ask", "illa", "blind", "listen", "evaluate", "prove", "cta"]);

/** A living Chennai street at dusk, synthesised live (no audio files): traffic hum, distant horns, birds, chatter. */
function startAmbience(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 2.5);
  master.connect(ctx.destination);
  // brown noise -> low-pass = traffic rumble
  const len = 4 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.2;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const hum = ctx.createGain();
  hum.gain.value = 0.9;
  noise.connect(lp).connect(hum).connect(master);
  noise.start();
  // chatter: band-passed noise that swells
  const chat = ctx.createBufferSource();
  chat.buffer = buf;
  chat.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 900;
  bp.Q.value = 0.8;
  const chatGain = ctx.createGain();
  chatGain.gain.value = 0.18;
  chat.connect(bp).connect(chatGain).connect(master);
  chat.start();
  const timers: number[] = [];
  const horn = () => {
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35 + Math.random() * 0.3);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    [420 + Math.random() * 60, 530 + Math.random() * 60].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      o.connect(g);
      o.start(t);
      o.stop(t + 0.8);
    });
    g.connect(pan).connect(master);
    timers.push(window.setTimeout(horn, 5000 + Math.random() * 9000));
  };
  const bird = () => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    const f0 = 2600 + Math.random() * 1400;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.2);
    timers.push(window.setTimeout(bird, 1800 + Math.random() * 6000));
  };
  timers.push(window.setTimeout(horn, 3000), window.setTimeout(bird, 1200));
  return {
    duck: (on: boolean) => master.gain.setTargetAtTime(on ? 0.08 : 0.22, ctx.currentTime, 0.3),
    stop: () => {
      timers.forEach(clearTimeout);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      window.setTimeout(() => { noise.stop(); chat.stop(); }, 1500);
    },
  };
}

export function StorySound() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const amb = useRef<ReturnType<typeof startAmbience> | null>(null);
  const voice = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!on) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    amb.current = startAmbience(ctx);
    let lastStep = -1;
    const play = (step: number) => {
      const id = STEP_IDS[step];
      if (step === lastStep || !VOICED.has(id)) return;
      lastStep = step;
      voice.current?.pause();
      const a = new Audio(`/audio/${id}.m4a`);
      voice.current = a;
      amb.current?.duck(true);
      a.onended = () => amb.current?.duck(false);
      void a.play().catch(() => amb.current?.duck(false));
    };
    play(useStory.getState().step);
    const unsub = useStory.subscribe((s) => play(s.step));
    return () => {
      unsub();
      voice.current?.pause();
      amb.current?.stop();
      window.setTimeout(() => void ctx.close(), 1600);
    };
  }, [on]);

  return (
    <button
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-bold text-[#002e6e] shadow-[0_10px_30px_rgba(0,20,60,0.35)] backdrop-blur hover:bg-white"
    >
      {on ? <Volume2 className="size-4 text-[#00baf2]" /> : <VolumeX className="size-4" />}
      {on ? "Sound on" : "Turn on sound"}
      {!on && <span className="relative flex size-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00baf2] opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-[#00baf2]" /></span>}
    </button>
  );
}
