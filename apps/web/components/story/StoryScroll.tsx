"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStory } from "@/lib/story";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** The [data-step] section crossing mid-viewport becomes the active chapter; cards and counters animate in. */
export function StoryScroll() {
  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    useStory.getState().set({ reduced });
    gsap.utils.toArray<HTMLElement>("[data-step]").forEach((el) => {
      const i = Number(el.dataset.step);
      ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => {
          if (self.isActive && useStory.getState().step !== i) useStory.getState().set({ step: i, stepT: 0 });
        },
      });
    });
    ScrollTrigger.create({
      trigger: "#story",
      start: "top top",
      end: "bottom bottom",
      onUpdate: ({ progress }) => useStory.getState().set({ progress }),
    });
    if (reduced) return;
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
      gsap.from(el, { opacity: 0, y: 40, filter: "blur(6px)", duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 82%", once: true } });
    });
    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
      const to = Number(el.dataset.count);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: to,
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onUpdate: () => (el.textContent = (el.dataset.prefix ?? "") + Math.round(obj.v).toLocaleString("en-IN") + (el.dataset.suffix ?? "")),
      });
    });
  });
  return null;
}
