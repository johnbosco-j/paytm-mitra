import { create } from "zustand";

/** Story chapters, in scroll order. The 3D stage reacts to the active step, so scene and copy always match. */
export const STEP_IDS = [
  "intro", // Chennai street at dusk
  "arrive", // a customer walks up to the shop
  "ask", // a customer asks for mango lassi
  "illa", // "illa" — the empty shelf slot
  "blind", // the QR sees nothing: no payment, no record
  "pile", // missed asks pile up over a week
  "listen", // MITRA hears it, in Tamil
  "evaluate", // money maths, cautious trial
  "approve", // owner approves, supplier message
  "deliver", // the auto brings the stock
  "prove", // shelf full, ₹182 gross profit
  "cta",
] as const;
export type StepId = (typeof STEP_IDS)[number];

/** 0 = golden-hour dusk, 1 = night. */
export const STEP_TOD: Record<StepId, number> = {
  intro: 0.38, arrive: 0.42, ask: 0.48, illa: 0.55, blind: 0.62, pile: 0.75, listen: 0.85, evaluate: 0.9, approve: 0.9, deliver: 0.5, prove: 0.55, cta: 0.7,
};

type Story = {
  step: number;
  stepT: number;
  progress: number;
  tod: number;
  reduced: boolean;
  ready: boolean;
  set: (p: Partial<Omit<Story, "set">>) => void;
};

export const useStory = create<Story>((set) => ({
  step: 0,
  stepT: 0,
  progress: 0,
  tod: STEP_TOD.intro,
  reduced: false,
  ready: false,
  set: (p) => set(p),
}));

export const stepIndex = (id: StepId) => STEP_IDS.indexOf(id);
/** True once the story has reached (or passed) a chapter. */
export const reached = (step: number, id: StepId) => step >= stepIndex(id);
