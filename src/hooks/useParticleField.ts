import { useEffect, useRef, useState } from "react";

export type BurstTone = "amber" | "green" | "rose" | "paper";

export type ParticleBurst = {
  id: string;
  tone: BurstTone;
  x: number;
  y: number;
  particles: Array<{
    id: string;
    dx: number;
    dy: number;
    size: number;
    delay: number;
  }>;
};

type BurstTarget =
  | DOMRect
  | {
      x: number;
      y: number;
      width?: number;
      height?: number;
    };

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createBurst(x: number, y: number, tone: BurstTone): ParticleBurst {
  return {
    id: createId(),
    tone,
    x,
    y,
    particles: Array.from({ length: 14 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 14 + random(-0.18, 0.18);
      const distance = random(24, 66);

      return {
        id: createId(),
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        size: random(5, 11),
        delay: random(0, 0.08),
      };
    }),
  };
}

export function useParticleField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const [bursts, setBursts] = useState<ParticleBurst[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const spawnBurst = (target: BurstTarget, tone: BurstTone = "amber") => {
    const bounds = fieldRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    const centerX = target.x + ((target.width ?? 0) / 2);
    const centerY = target.y + ((target.height ?? 0) / 2);
    const burst = createBurst(centerX - bounds.left, centerY - bounds.top, tone);

    setBursts((current) => [...current, burst]);

    const timer = window.setTimeout(() => {
      setBursts((current) => current.filter((item) => item.id !== burst.id));
      timersRef.current = timersRef.current.filter((value) => value !== timer);
    }, 900);

    timersRef.current.push(timer);
  };

  return {
    bursts,
    fieldRef,
    spawnBurst,
  };
}
