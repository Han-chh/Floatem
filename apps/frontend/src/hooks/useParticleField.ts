import { useCallback, useEffect, useRef, useState } from "react";

export type BurstTone = "amber" | "green" | "rose" | "paper" | "confetti";

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
    lift?: number;
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
    tone === "confetti"
      ? { count: 16, distanceMin: 32, distanceMax: 94, sizeMin: 3, sizeMax: 7 }
      : tone === "rose"
      ? { count: 40, distanceMin: 42, distanceMax: 128, sizeMin: 3, sizeMax: 12 }
      : tone === "paper"
        ? { count: 18, distanceMin: 22, distanceMax: 62, sizeMin: 4, sizeMax: 10 }
        : { count: 18, distanceMin: 24, distanceMax: 72, sizeMin: 5, sizeMax: 12 };

  return {
    id: createId(),
    tone,
    x,
    y,
    particles: Array.from({ length: config.count }, (_, index) => {
      if (tone === "confetti") {
        const distance = random(config.distanceMin, config.distanceMax);
        const sideBias = index % 2 === 0 ? -1 : 1;
        const dx = sideBias * random(distance * 0.12, distance * 0.86) + random(-10, 10);

        return {
          id: createId(),
          dx,
          dy: random(30, 82),
          size: random(config.sizeMin, config.sizeMax),
          delay: random(0, 0.1),
          rotation: random(-360, 360),
          stretchX: random(1.6, 3),
          stretchY: random(0.22, 0.46),
          lift: -random(28, 78),
        };
      }

      const angle = (Math.PI * 2 * index) / config.count + random(-0.16, 0.16);
      const distance = random(config.distanceMin, config.distanceMax);
      const isShard = tone === "rose" ? Math.random() > 0.08 : Math.random() > 0.62;

      return {
        id: createId(),
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        size: random(config.sizeMin, config.sizeMax),
        delay: random(0, tone === "rose" ? 0.09 : 0.08),
        rotation: random(-220, 220),
        stretchX: isShard ? random(1.9, 3.6) : 1,
        stretchY: isShard ? random(0.18, 0.42) : 1,
      };
    }),
  };
}

function createBurstCluster(target: BurstTarget, bounds: DOMRect, tone: BurstTone) {
  const width = target.width ?? 0;
  const height = target.height ?? 0;
  const centerX = target.x + ((target.width ?? 0) / 2);
  const centerY = target.y + ((target.height ?? 0) / 2);

  if (tone === "confetti") {
    const anchorPoints = width >= 140
      ? [
          [0.32, 0.5],
          [0.68, 0.5],
        ]
      : [[0.5, 0.5]];

    return anchorPoints.map(([xRatio, yRatio]) =>
      createBurst(
        target.x + width * xRatio - bounds.left + random(-6, 6),
        target.y + height * yRatio - bounds.top + random(-6, 6),
        tone,
      ),
    );
  }

  if (tone !== "rose" || width < 72 || height < 72) {
    return [createBurst(centerX - bounds.left, centerY - bounds.top, tone)];
  }

  const anchorPoints = [
    [0.14, 0.2],
    [0.34, 0.14],
    [0.5, 0.18],
    [0.66, 0.14],
    [0.86, 0.22],
    [0.26, 0.76],
    [0.5, 0.82],
    [0.74, 0.76],
  ];

  return anchorPoints.map(([xRatio, yRatio]) =>
    createBurst(
      target.x + width * xRatio - bounds.left + random(-8, 8),
      target.y + height * yRatio - bounds.top + random(-8, 8),
      tone,
    ),
  );
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

  const spawnBurst = useCallback((target: BurstTarget, tone: BurstTone = "amber") => {
    const bounds = fieldRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    const nextBursts = createBurstCluster(target, bounds, tone);
    setBursts((current) => [...current, ...nextBursts]);

    nextBursts.forEach((burst) => {
      const timer = window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== burst.id));
        timersRef.current = timersRef.current.filter((value) => value !== timer);
      }, tone === "confetti" ? 1040 : tone === "rose" ? 1320 : 900);

      timersRef.current.push(timer);
    });
  }, []);

  return {
    bursts,
    fieldRef,
    spawnBurst,
  };
}
