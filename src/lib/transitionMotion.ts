import type { CSSProperties } from "react";
import type { AnimationSpeed, TransitionStyle } from "./models";

export type TransitionDirection = -1 | 1;

type SwitchMotionConfig = {
  contentStyle?: CSSProperties;
  presenceMode: "sync" | "wait";
  sceneStyle?: CSSProperties;
  transition: {
    duration: number;
    ease: readonly [number, number, number, number];
  };
  variants: {
    animate: Record<string, string | number>;
    exit: (direction: TransitionDirection) => Record<string, string | number>;
    initial: (direction: TransitionDirection) => Record<string, string | number>;
  };
};

const SHARED_EASE = [0.22, 1, 0.36, 1] as const;
const PAGE_EASE = [0.2, 0.9, 0.24, 1] as const;

const TAB_DURATIONS: Record<AnimationSpeed, number> = {
  rapid: 0.16,
  mediate: 0.24,
  slow: 0.34,
};

const LIFT_TAB_DURATIONS: Record<AnimationSpeed, number> = {
  rapid: 0.24,
  mediate: 0.34,
  slow: 0.46,
};

const PAGE_TAB_DURATIONS: Record<AnimationSpeed, number> = {
  rapid: 0.46,
  mediate: 0.6,
  slow: 0.74,
};

const SURFACE_SLIDE_DURATIONS: Record<AnimationSpeed, number> = {
  rapid: 0.24,
  mediate: 0.34,
  slow: 0.46,
};

const SURFACE_LIFT_DURATIONS: Record<AnimationSpeed, number> = {
  rapid: 0.3,
  mediate: 0.4,
  slow: 0.54,
};

const SURFACE_PAGE_DURATIONS: Record<AnimationSpeed, number> = {
  rapid: 0.44,
  mediate: 0.58,
  slow: 0.72,
};

function getSceneStyle(transitionStyle: TransitionStyle): CSSProperties | undefined {
  if (transitionStyle === "page") {
    return { perspective: 1100, transformStyle: "preserve-3d" };
  }

  if (transitionStyle === "lift") {
    return { perspective: 1280, transformStyle: "preserve-3d" };
  }

  return undefined;
}

function getLayerStyle(transitionStyle: TransitionStyle): CSSProperties | undefined {
  if (transitionStyle === "page" || transitionStyle === "lift") {
    return {
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
    };
  }

  return undefined;
}

export function getTabMotionConfig(transitionStyle: TransitionStyle, animationSpeed: AnimationSpeed): SwitchMotionConfig {
  if (transitionStyle === "page") {
    return {
      presenceMode: "sync",
      sceneStyle: getSceneStyle(transitionStyle),
      contentStyle: getLayerStyle(transitionStyle),
      transition: { duration: PAGE_TAB_DURATIONS[animationSpeed], ease: PAGE_EASE },
      variants: {
        initial: (direction) => ({
          filter: "brightness(0.82) saturate(0.88)",
          opacity: 0.46,
          rotateY: direction === 1 ? 108 : -108,
          scale: 0.9,
          transformOrigin: direction === 1 ? "right center" : "left center",
          x: direction === 1 ? 78 : -78,
          zIndex: 0,
        }),
        animate: {
          filter: "brightness(1) saturate(1)",
          opacity: 1,
          rotateY: 0,
          scale: 1,
          transformOrigin: "center center",
          x: 0,
          zIndex: 1,
        },
        exit: (direction) => ({
          filter: "brightness(0.74) saturate(0.84)",
          opacity: 0.22,
          rotateY: direction === 1 ? -116 : 116,
          scale: 0.92,
          transformOrigin: direction === 1 ? "left center" : "right center",
          x: direction === 1 ? -92 : 92,
          zIndex: 2,
        }),
      },
    };
  }

  if (transitionStyle === "lift") {
    return {
      presenceMode: "sync",
      sceneStyle: getSceneStyle(transitionStyle),
      contentStyle: getLayerStyle(transitionStyle),
      transition: { duration: LIFT_TAB_DURATIONS[animationSpeed], ease: SHARED_EASE },
      variants: {
        initial: (direction) => ({
          filter: "blur(10px) saturate(0.9)",
          opacity: 0,
          rotateX: direction === 1 ? 14 : -14,
          rotateZ: direction === 1 ? 3.5 : -3.5,
          scale: 0.94,
          transformOrigin: "center bottom",
          x: direction === 1 ? 18 : -18,
          y: 26,
          zIndex: 0,
        }),
        animate: {
          filter: "blur(0px) saturate(1)",
          opacity: 1,
          rotateX: 0,
          rotateZ: 0,
          scale: 1,
          transformOrigin: "center center",
          x: 0,
          y: 0,
          zIndex: 1,
        },
        exit: (direction) => ({
          filter: "blur(8px) saturate(0.92)",
          opacity: 0,
          rotateX: direction === 1 ? -10 : 10,
          rotateZ: direction === 1 ? -2.5 : 2.5,
          scale: 1.02,
          transformOrigin: "center top",
          x: direction === 1 ? -16 : 16,
          y: -24,
          zIndex: 2,
        }),
      },
    };
  }

  return {
    presenceMode: "wait",
    transition: { duration: TAB_DURATIONS[animationSpeed], ease: SHARED_EASE },
    variants: {
      initial: (direction) => ({ opacity: 0, scale: 0.99, x: direction === 1 ? 14 : -14 }),
      animate: { opacity: 1, scale: 1, x: 0 },
      exit: (direction) => ({ opacity: 0, scale: 0.995, x: direction === 1 ? -12 : 12 }),
    },
  };
}

export function getSurfaceMotionConfig(transitionStyle: TransitionStyle, animationSpeed: AnimationSpeed): SwitchMotionConfig {
  if (transitionStyle === "page") {
    return {
      presenceMode: "sync",
      sceneStyle: getSceneStyle(transitionStyle),
      contentStyle: getLayerStyle(transitionStyle),
      transition: { duration: SURFACE_PAGE_DURATIONS[animationSpeed], ease: PAGE_EASE },
      variants: {
        initial: (direction) => ({
          filter: "brightness(0.84) saturate(0.9)",
          opacity: 0.55,
          rotateY: direction === 1 ? 78 : -78,
          scale: 0.94,
          transformOrigin: direction === 1 ? "right center" : "left center",
          x: direction === 1 ? "58%" : "-58%",
          zIndex: 0,
        }),
        animate: {
          filter: "brightness(1) saturate(1)",
          opacity: 1,
          rotateY: 0,
          scale: 1,
          transformOrigin: "center center",
          x: "0%",
          zIndex: 1,
        },
        exit: (direction) => ({
          filter: "brightness(0.74) saturate(0.84)",
          opacity: 0.2,
          rotateY: direction === 1 ? -86 : 86,
          scale: 0.94,
          transformOrigin: direction === 1 ? "left center" : "right center",
          x: direction === 1 ? "-62%" : "62%",
          zIndex: 2,
        }),
      },
    };
  }

  if (transitionStyle === "lift") {
    return {
      presenceMode: "sync",
      sceneStyle: getSceneStyle(transitionStyle),
      contentStyle: getLayerStyle(transitionStyle),
      transition: { duration: SURFACE_LIFT_DURATIONS[animationSpeed], ease: SHARED_EASE },
      variants: {
        initial: (direction) => ({
          filter: "blur(14px) saturate(0.92)",
          opacity: 0,
          rotateX: direction === 1 ? 12 : -12,
          rotateZ: direction === 1 ? 2.5 : -2.5,
          scale: 0.95,
          transformOrigin: "center bottom",
          x: direction === 1 ? "8%" : "-8%",
          y: 40,
          zIndex: 0,
        }),
        animate: {
          filter: "blur(0px) saturate(1)",
          opacity: 1,
          rotateX: 0,
          rotateZ: 0,
          scale: 1,
          transformOrigin: "center center",
          x: "0%",
          y: 0,
          zIndex: 1,
        },
        exit: (direction) => ({
          filter: "blur(10px) saturate(0.92)",
          opacity: 0,
          rotateX: direction === 1 ? -9 : 9,
          rotateZ: direction === 1 ? -2 : 2,
          scale: 1.02,
          transformOrigin: "center top",
          x: direction === 1 ? "-6%" : "6%",
          y: -28,
          zIndex: 2,
        }),
      },
    };
  }

  return {
    presenceMode: "wait",
    transition: { duration: SURFACE_SLIDE_DURATIONS[animationSpeed], ease: SHARED_EASE },
    variants: {
      initial: (direction) => ({
        opacity: 0,
        scale: 0.985,
        x: direction > 0 ? "100%" : "-100%",
      }),
      animate: {
        opacity: 1,
        scale: 1,
        x: "0%",
      },
      exit: (direction) => ({
        opacity: 0,
        scale: 0.985,
        x: direction > 0 ? "-100%" : "100%",
      }),
    },
  };
}
