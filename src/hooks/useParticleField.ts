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
    rotation: number;
    stretchX: number;
    stretchY: number;
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
  const config =
    tone === "rose"
      ? { count: 26, distanceMin: 36, distanceMax: 96, sizeMin: 5, sizeMax: 15 }
      : tone === "paper"
        ? { count: 18, distanceMin: 22, distanceMax: 62, sizeMin: 4, sizeMax: 10 }
        : { count: 18, distanceMin: 24, distanceMax: 72, sizeMin: 5, sizeMax: 12 };

  return {
    id: createId(),
    tone,
    x,
    y,
    particles: Array.from({ length: config.count }, (_, index) => {
      const angle = (Math.PI * 2 * index) / config.count + random(-0.16, 0.16);
      const distance = random(config.distanceMin, config.distanceMax);
      const isShard = tone === "rose" ? Math.random() > 0.25 : Math.random() > 0.62;

      return {
        id: createId(),
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        size: random(config.sizeMin, config.sizeMax),
        delay: random(0, tone === "rose" ? 0.05 : 0.08),
        rotation: random(-140, 140),
        stretchX: isShard ? random(1.6, 2.4) : 1,
        stretchY: isShard ? random(0.32, 0.52) : 1,
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
