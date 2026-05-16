import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "bottom" | "top";
type TooltipAlign = "center" | "left" | "right";

type TooltipState = {
  align: TooltipAlign;
  label: string;
  placement: TooltipPlacement;
  rect: DOMRect;
  shift: "left" | null;
};

type TooltipPosition = {
  left: number;
  top: number;
};

const TOOLTIP_GAP = 8;
const TOOLTIP_MARGIN = 10;
const TOOLTIP_LEFT_SHIFT = 12;
const TOOLTIP_HOVER_DELAY_MS = 650;

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findTooltipButton(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLButtonElement>("button[data-tooltip]") : null;
}

function readTooltipState(button: HTMLButtonElement): TooltipState | null {
  const label = button.dataset.tooltip?.trim();

  if (!label) {
    return null;
  }

  const placement = button.dataset.tooltipPlacement === "bottom" ? "bottom" : "top";
  const align =
    button.dataset.tooltipAlign === "left" || button.dataset.tooltipAlign === "right"
      ? button.dataset.tooltipAlign
      : "center";

  return {
    align,
    label,
    placement,
    rect: button.getBoundingClientRect(),
    shift: button.dataset.tooltipShift === "left" ? "left" : null,
  };
}

function resolvePosition(state: TooltipState, tooltipRect: DOMRect): TooltipPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = Math.max(TOOLTIP_MARGIN, viewportWidth - tooltipRect.width - TOOLTIP_MARGIN);
  const maxTop = Math.max(TOOLTIP_MARGIN, viewportHeight - tooltipRect.height - TOOLTIP_MARGIN);
  const preferredTop =
    state.placement === "bottom"
      ? state.rect.bottom + TOOLTIP_GAP
      : state.rect.top - tooltipRect.height - TOOLTIP_GAP;
  const fallbackTop =
    state.placement === "bottom"
      ? state.rect.top - tooltipRect.height - TOOLTIP_GAP
      : state.rect.bottom + TOOLTIP_GAP;
  const top = clampValue(
    preferredTop < TOOLTIP_MARGIN || preferredTop > maxTop ? fallbackTop : preferredTop,
    TOOLTIP_MARGIN,
    maxTop,
  );
  const centeredLeft = state.rect.left + state.rect.width / 2 - tooltipRect.width / 2;
  const alignedLeft =
    state.align === "left"
      ? state.rect.right - tooltipRect.width
      : state.align === "right"
        ? state.rect.left
        : centeredLeft;
  const shiftedLeft = state.shift === "left" ? alignedLeft - TOOLTIP_LEFT_SHIFT : alignedLeft;

  return {
    left: clampValue(shiftedLeft, TOOLTIP_MARGIN, maxLeft),
    top,
  };
}

export function TooltipLayer() {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingButtonRef = useRef<HTMLButtonElement | null>(null);
  const hoverDelayTimerRef = useRef<number | null>(null);
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const clearHoverDelayTimer = () => {
      if (hoverDelayTimerRef.current !== null) {
        window.clearTimeout(hoverDelayTimerRef.current);
        hoverDelayTimerRef.current = null;
      }
    };

    const showTooltip = (button: HTMLButtonElement) => {
      const nextState = readTooltipState(button);
      activeButtonRef.current = nextState ? button : null;
      setTooltipState(nextState);
    };

    const scheduleTooltip = (button: HTMLButtonElement) => {
      if (activeButtonRef.current === button) {
        showTooltip(button);
        return;
      }

      clearHoverDelayTimer();
      activeButtonRef.current = null;
      pendingButtonRef.current = button;
      setTooltipState(null);
      hoverDelayTimerRef.current = window.setTimeout(() => {
        if (pendingButtonRef.current !== button || !document.contains(button)) {
          return;
        }

        pendingButtonRef.current = null;
        hoverDelayTimerRef.current = null;
        showTooltip(button);
      }, TOOLTIP_HOVER_DELAY_MS);
    };

    const hideTooltip = () => {
      clearHoverDelayTimer();
      pendingButtonRef.current = null;
      activeButtonRef.current = null;
      setTooltipState(null);
    };

    const handlePointerOver = (event: PointerEvent) => {
      const button = findTooltipButton(event.target);
      if (button) {
        scheduleTooltip(button);
      }
    };

    const handlePointerOut = (event: PointerEvent) => {
      const button = activeButtonRef.current ?? pendingButtonRef.current;
      if (!button) {
        return;
      }

      if (event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) {
        return;
      }

      hideTooltip();
    };

    const handleFocusIn = (event: FocusEvent) => {
      const button = findTooltipButton(event.target);
      if (button) {
        clearHoverDelayTimer();
        pendingButtonRef.current = null;
        showTooltip(button);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const button = activeButtonRef.current;
      if (!button) {
        return;
      }

      if (event.relatedTarget instanceof Node && button.contains(event.relatedTarget)) {
        return;
      }

      hideTooltip();
    };

    const refreshActiveTooltip = () => {
      const button = activeButtonRef.current;
      if (!button || !document.contains(button)) {
        activeButtonRef.current = null;
        pendingButtonRef.current = null;
        setTooltipState(null);
        return;
      }

      setTooltipState(readTooltipState(button));
    };

    document.addEventListener("pointerover", handlePointerOver, true);
    document.addEventListener("pointerout", handlePointerOut, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("resize", refreshActiveTooltip);
    window.addEventListener("scroll", refreshActiveTooltip, true);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver, true);
      document.removeEventListener("pointerout", handlePointerOut, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("resize", refreshActiveTooltip);
      window.removeEventListener("scroll", refreshActiveTooltip, true);
      clearHoverDelayTimer();
    };
  }, []);

  useLayoutEffect(() => {
    if (!tooltipState || !tooltipRef.current) {
      setPosition(null);
      return;
    }

    setPosition(resolvePosition(tooltipState, tooltipRef.current.getBoundingClientRect()));
  }, [tooltipState]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {tooltipState ? (
        <motion.div
          ref={tooltipRef}
          className="quicknote-tooltip-bubble"
          initial={{ opacity: 0, y: tooltipState.placement === "bottom" ? -4 : 4 }}
          animate={{ opacity: position ? 1 : 0, x: 0, y: 0 }}
          exit={{ opacity: 0, y: tooltipState.placement === "bottom" ? -4 : 4 }}
          transition={{ duration: 0.075, ease: "easeOut" }}
          style={{
            left: position?.left ?? -999,
            top: position?.top ?? -999,
          }}
        >
          {tooltipState.label}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
