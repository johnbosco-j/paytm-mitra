"use client";

import { Html } from "@react-three/drei";
import type { ComponentProps, MutableRefObject } from "react";

/** DOM container for 3D speech bubbles. StoryCanvas sets it before the scene renders, so drei's Html gets a stable
 * target on first mount; without it each bubble re-mounts once and React warns about a synchronous root unmount. */
export const overlayRoot: MutableRefObject<HTMLElement> = { current: null as unknown as HTMLElement };

export function Overlay(props: ComponentProps<typeof Html>) {
  return <Html portal={overlayRoot} {...props} />;
}
