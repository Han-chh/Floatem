import { useEffect, useMemo, useState } from "react";

type ScrollRootRef = { current: HTMLElement | null };

type ThemeAtmosphereProps = {
  scrollRootRef: ScrollRootRef;
  contentSelector?: string;
};

type Motif = {
  id: number;
  side: "left" | "right";
  top: number;
  size: number;
  rotation: number;
  variant: number;
};

const MOTIF_STEP = 280;

function seededValue(seed: number, index: number, salt: number) {
  const value = Math.sin(seed * 0.013 + index * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function buildMotif(seed: number, index: number): Motif {
  const side = seededValue(seed, index, 1) > 0.5 ? "right" : "left";
  return {
    id: index,
    side,
    top: index * MOTIF_STEP + 42 + seededValue(seed, index, 2) * 110,
    size: 92 + seededValue(seed, index, 3) * 74,
    rotation: -28 + seededValue(seed, index, 4) * 56,
    variant: index % 4,
  };
}

function MotifGlyph({ variant }: { variant: number }) {
  return (
    <svg viewBox="0 0 160 160" className="theme-scroll-motif__glyph">
      <g className="theme-motif theme-motif--classic">
        {variant === 0 ? <path d="M-6 38Q49 8 105 31t69 3v88q-44-19-84 1T-6 116Z" /> : null}
        {variant === 1 ? <path d="M8 26q52 25 103 4 24-10 48 1v94q-35-14-70 5-42 22-81-3Z" /> : null}
        {variant === 2 ? <path d="M-3 50q45-31 91-5 34 19 75-3v76q-37 23-75 2-43-24-91 3Z" /> : null}
        {variant === 3 ? <path d="M11 34q33-16 71 2 41 20 72-5v92q-33 17-72-3-37-18-71-1Z" /> : null}
        <path className="theme-motif-detail" d={variant % 2 ? "M17 55q44 18 87 1 23-9 43-2M18 82q36 15 70 3" : "M5 67q42-25 86-2 31 17 64 0M21 94q31-13 64 2"} />
      </g>

      <g className="theme-motif theme-motif--forest">
        <path className="theme-motif-stem" d={variant % 2 ? "M58-7q-8 52 4 104t-3 71M111-8q-17 59-4 113t-8 65" : "M42-8q17 59 2 112t8 67M106-8q9 52-3 102t5 76"} />
        <path className="theme-motif-detail" d={variant < 2 ? "M49 42h21M45 91h27M99 55h22M98 112h17" : "M36 31h19M40 78h23M97 45h19M94 101h24"} />
        <path d={variant % 2 ? "M62 39q35-29 60-5-29 27-60 5ZM58 78q-34-23-57 4 30 20 57-4ZM105 101q35-20 53 8-31 18-53-8Z" : "M45 48Q12 18-9 43q27 27 54 5Zm58 24q31-31 57-10-25 29-57 10ZM50 116q-36-18-53 12 31 15 53-12Z"} />
      </g>

      <g className="theme-motif theme-motif--ivory">
        <path d={variant === 0 ? "M79 20c29-25 57 4 40 31 35-3 43 37 16 52-23 13-43-4-50-25-4 29-39 39-56 15-20-28 3-52 32-43-17-22-4-45 18-30Zm2 33c19-3 30 12 23 28-8 18-35 20-44 2-9-16 2-28 21-30Z" : variant === 1 ? "M79 18c22-15 48 3 38 29 31 2 39 36 17 53-24 18-48 0-51-23-10 27-43 29-56 3-13-27 9-46 35-38-11-21-3-32 17-24Zm0 36c17-5 31 8 27 25-5 19-33 25-45 8-10-15 1-28 18-33Z" : variant === 2 ? "M80 19c31-17 53 11 38 36 34 7 33 45 5 57-25 10-42-10-44-33-13 25-47 23-57-4-9-25 13-43 38-34-8-25 0-38 20-42Zm-1 38c18-8 34 4 31 22-3 19-30 29-44 13-12-14-4-28 13-35Z" : "M80 20c25-28 57-1 42 29 32-8 48 26 27 49-20 22-46 9-57-13-1 30-34 44-55 23-22-22-4-49 24-45-16-21-1-48 19-43Zm2 35c18 0 29 16 21 32-9 17-35 16-43-1-8-16 4-30 22-31Z"} />
        <path className="theme-motif-detail" d={variant % 2 ? "M80 112q17 26 46 38M80 111q-23 22-48 28" : "M79 110q-8 29 3 52M78 121q24 8 42 29"} />
      </g>

      <g className="theme-motif theme-motif--violet">
        <path d={variant === 0 ? "M78 77C36 72 27 34 56 20c28-13 40 20 26 43 20-29 54-17 52 12-2 28-33 34-52 14 14 28-14 50-37 34-22-15-10-43 33-46Z" : variant === 1 ? "M78 79C40 63 43 29 69 20c29-10 38 25 18 43 27-20 53-1 44 26-8 27-37 25-51 2 6 29-24 46-44 27-19-18-1-42 42-39Z" : variant === 2 ? "M80 77C35 82 23 44 49 25c25-19 45 10 37 36 13-31 49-30 58-3 9 28-20 45-47 31 22 23 1 51-25 43-27-8-29-39 8-55Z" : "M81 78C43 75 28 43 49 24c23-21 48 5 41 34 15-31 48-27 55 2 7 28-23 42-47 28 18 25-7 51-31 40-25-10-23-39 14-50Z"} />
        <path className="theme-motif-detail" d={variant % 2 ? "M81 87q6 35 34 62M82 105q-24 13-36 36" : "M80 89q-9 37 12 70M77 112q-20 6-34 24"} />
      </g>

      <g className="theme-motif theme-motif--night">
        <circle className="theme-motif-halo" cx="80" cy="72" r={variant % 2 ? 58 : 51} />
        <path d={variant === 0 ? "M93 20c-38 11-57 53-43 89 14 35 53 51 87 34-25-4-44-21-50-45-8-31 5-62 31-79-9-2-17-2-25 1Z" : variant === 1 ? "M67 18c39 5 65 41 60 79-5 39-41 66-78 61 25-12 41-37 41-65 0-32-18-59-45-72 7-2 15-3 22-3Z" : variant === 2 ? "M104 27c-37 1-66 33-65 70 1 37 32 66 69 64-21-12-34-35-32-60 2-28 19-53 43-65-5-4-10-7-15-9Z" : "M57 29c33-13 71 3 86 36 15 34 0 74-34 89 15-19 20-45 10-69-11-26-34-43-60-45-1-4-1-7-2-11Z"} />
        <path className="theme-motif-detail" d={variant % 2 ? "M22 37l4 9 9 4-9 4-4 9-4-9-9-4 9-4ZM135 118l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" : "M30 124l4 10 10 4-10 4-4 10-4-10-10-4 10-4ZM132 42l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"} />
      </g>
    </svg>
  );
}

export function ThemeAtmosphere({ scrollRootRef, contentSelector = "[data-theme-scroll-content]" }: ThemeAtmosphereProps) {
  const [seed] = useState(() => Math.random() * 100_000);
  const [contentHeight, setContentHeight] = useState(720);
  const [motifCount, setMotifCount] = useState(4);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) {
      return;
    }

    const content = root.querySelector<HTMLElement>(contentSelector);
    const measure = () => {
      const nextHeight = Math.max(root.clientHeight, content?.scrollHeight ?? root.scrollHeight);
      setContentHeight(nextHeight);
      setMotifCount((current) => Math.max(current, Math.min(Math.ceil(nextHeight / MOTIF_STEP), 4)));
    };
    const extendForScroll = () => {
      const needed = Math.ceil((root.scrollTop + root.clientHeight * 1.5) / MOTIF_STEP);
      const maximum = Math.ceil(contentHeight / MOTIF_STEP) + 1;
      setMotifCount((current) => Math.max(current, Math.min(needed, maximum)));
    };

    measure();
    extendForScroll();
    root.addEventListener("scroll", extendForScroll, { passive: true });
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resizeObserver?.observe(root);
    if (content) {
      resizeObserver?.observe(content);
    }
    const mutationObserver = new MutationObserver(measure);
    if (content) {
      mutationObserver.observe(content, { childList: true, subtree: true });
    }

    return () => {
      root.removeEventListener("scroll", extendForScroll);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
    };
  }, [contentHeight, contentSelector, scrollRootRef]);

  const motifs = useMemo(
    () => Array.from({ length: motifCount }, (_, index) => buildMotif(seed, index)),
    [motifCount, seed],
  );

  return (
    <div className="theme-atmosphere" style={{ height: contentHeight }} aria-hidden="true">
      {motifs.map((motif) => (
        <div
          key={motif.id}
          className={`theme-scroll-motif theme-scroll-motif--${motif.side}`}
          style={{
            top: motif.top,
            width: motif.size,
            height: motif.size,
            transform: `rotate(${motif.rotation}deg)`,
          }}
        >
          <MotifGlyph variant={motif.variant} />
        </div>
      ))}
    </div>
  );
}
