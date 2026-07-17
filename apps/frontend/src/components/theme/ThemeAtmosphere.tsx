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

      <g className="theme-motif theme-motif--orchid">
        <path d={variant === 0 ? "M80 76C48 66 40 34 62 24c22-10 29 21 20 42 8-30 37-42 50-21 12 20-11 37-38 36 29 2 43 27 27 43-17 16-37-2-40-31-6 27-28 42-43 26-16-18 4-38 31-39-25-2-43-19-31-36 12-17 36 2 42 32Z" : variant === 1 ? "M78 78C51 58 54 27 77 22c23-4 23 28 8 47 17-25 49-28 56-5 7 21-20 33-45 24 27 10 33 39 12 49-20 10-34-15-27-41-11 25-36 33-47 13-12-20 13-34 39-27-25-10-37-33-19-45 18-12 36 13 24 41Z" : variant === 2 ? "M81 76C59 51 67 20 91 20c23 0 16 31-3 47 21-21 53-18 55 5 2 23-27 28-49 14 24 15 23 44 0 50-22 6-31-21-19-44-16 22-43 24-50 2-8-22 20-30 44-18-22-14-28-39-7-47 20-7 33 22 12 43Z" : "M79 77C44 69 37 39 59 28c23-12 31 20 22 42 11-28 42-39 53-16 11 22-15 37-41 31 27 8 36 37 15 49-21 12-35-12-29-40-12 27-39 34-49 12-10-23 17-35 42-24-26-8-39-29-22-43 17-14 35 9 29 38Z"} />
        <path className="theme-motif-detail" d={variant % 2 ? "M80 96q10 32 4 68M81 114q25-19 53-17M82 127q-30-12-57 4" : "M79 96q-7 34-2 68M78 112q-28-20-54-10M78 126q25-15 53-7"} />
      </g>

      <g className="theme-motif theme-motif--plum">
        <path className="theme-motif-detail" d={variant % 2 ? "M-8 133Q38 95 75 100t91-66M42 105q14-31 33-53M103 82q25 7 49-5" : "M-8 45q54 19 91 53t85 25M44 78q8-28 30-49M105 108q17-26 42-32"} />
        <path d={variant === 0 ? "M73 47c-15-18 7-38 23-23 7-22 36-15 33 8 22-7 32 20 12 31 18 14 0 39-18 25-4 23-33 22-35-1-20 12-37-13-18-27-22-9-13-38 10-34 2-23 31-29 32-6Z" : variant === 1 ? "M86 70c-17-17 3-39 21-25 4-23 34-20 34 4 21-10 35 15 17 29 20 11 5 39-15 27-1 23-31 27-36 4-18 15-39-8-23-25-23-7-18-36 5-34-1-23 28-33 34-11Z" : variant === 2 ? "M69 89c-15-18 7-38 23-23 7-22 36-15 33 8 22-7 32 20 12 31 18 14 0 39-18 25-4 23-33 22-35-1-20 12-37-13-18-27-22-9-13-38 10-34 2-23 31-29 32-6Z" : "M95 51c-17-17 3-39 21-25 4-23 34-20 34 4 21-10 35 15 17 29 20 11 5 39-15 27-1 23-31 27-36 4-18 15-39-8-23-25-23-7-18-36 5-34-1-23 28-33 34-11Z"} />
        <circle className="theme-motif-detail" cx={variant % 2 ? 108 : 101} cy={variant % 2 ? 72 : 66} r="5" />
      </g>

      <g className="theme-motif theme-motif--chrysanthemum">
        <path d={variant === 0 ? "M80 82C49 68 36 42 48 28c11-12 28 9 31 37-5-31 10-57 27-50 16 7 7 35-12 55 23-23 53-25 58-7 5 17-24 30-49 27 31 6 51 27 41 42-10 14-37-2-53-25 13 27 9 55-9 56-17 1-20-29-10-54-13 27-39 42-50 29-11-14 10-37 39-46-31 5-58-7-54-24 4-18 36-11 73 14Z" : variant === 1 ? "M78 80C52 59 48 31 63 22c15-8 27 16 23 43 4-31 24-53 39-43 14 10-2 36-25 51 28-17 58-13 59 5 1 18-30 23-53 14 28 13 43 39 30 51-13 11-34-10-46-35 8 30-2 56-19 54-17-3-14-33 0-56-18 24-47 33-55 17-8-16 16-34 46-37-32-1-56-18-48-34 8-16 37-2 64 28Z" : variant === 2 ? "M82 79C54 62 46 34 60 23c14-10 29 12 29 40 0-31 18-55 34-47 16 8 3 35-19 53 26-20 56-19 59-1 3 17-27 27-51 21 29 10 46 34 35 47-11 13-35-5-49-29 10 29 3 56-15 56-17 0-19-30-7-54-15 26-43 38-53 24-10-15 12-36 42-43-31 3-58-11-53-28 5-17 36-6 67 20Z" : "M80 81C50 68 36 44 47 29c10-14 30 6 35 34-7-30 7-57 24-52 17 5 10 34-8 56 22-25 52-29 59-12 7 17-21 32-47 31 31 4 53 23 44 39-9 15-38 1-56-21 15 27 13 55-5 58-17 3-23-27-15-53-11 29-36 46-49 34-12-13 6-38 35-49-30 8-59-2-57-20 2-18 34-14 73 7Z"} />
        <circle className="theme-motif-detail" cx="80" cy="84" r={variant % 2 ? 10 : 8} />
        <path className="theme-motif-detail" d={variant % 2 ? "M81 105q-4 31 10 58M85 128q28-15 52-5" : "M79 106q8 30-1 57M80 130q-28-13-52-1"} />
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
