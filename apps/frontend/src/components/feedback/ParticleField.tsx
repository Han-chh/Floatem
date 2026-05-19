import { AnimatePresence, motion } from "framer-motion";
import type { BurstTone, ParticleBurst } from "../../hooks/useParticleField";

type ParticleFieldProps = {
  bursts: ParticleBurst[];
};

const burstPalette: Record<BurstTone, string[]> = {
  amber: ["#f7d6a8", "#d8b07b", "#be6f47"],
  green: ["#c4e0ca", "#8fbd98", "#6f9b76"],
  rose: ["#ff7b8d", "#ff425c", "#e11337", "#8f001f"],
  paper: ["#fff9ef", "#f2e0c7", "#d6b48a"],
  confetti: ["#f4b942", "#ff7a59", "#2f6bff", "#1fa87a", "#fff9ef"],
};

export function ParticleField({ bursts }: ParticleFieldProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => (
          <motion.div
            key={burst.id}
            initial={{ opacity: 1, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: burst.tone === "confetti" ? 0.12 : 0.18 }}
            className="absolute"
            style={{ left: burst.x, top: burst.y }}
          >
            <motion.span
              className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: burst.tone === "rose" ? 34 : burst.tone === "confetti" ? 30 : 24,
                height: burst.tone === "rose" ? 34 : burst.tone === "confetti" ? 30 : 24,
                background: `radial-gradient(circle, ${burstPalette[burst.tone][0]} 0%, rgba(255,255,255,0) 70%)`,
              }}
              initial={{ scale: 0.3, opacity: 0.7 }}
              animate={{ scale: burst.tone === "rose" ? 2.9 : burst.tone === "confetti" ? 2 : 1.8, opacity: 0 }}
              transition={{ duration: burst.tone === "rose" ? 0.86 : burst.tone === "confetti" ? 0.42 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
            {burst.tone === "rose" ? (
              <motion.span
                className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{
                  width: 28,
                  height: 28,
                  borderColor: "rgba(255,66,92,0.9)",
                }}
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 3.4, opacity: 0 }}
                transition={{ duration: 0.74, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}

            {burst.particles.map((particle, index) => (
              <motion.span
                key={particle.id}
                className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: particle.size * particle.stretchX,
                  height: particle.size * particle.stretchY,
                  backgroundColor: burstPalette[burst.tone][index % burstPalette[burst.tone].length],
                  boxShadow:
                    burst.tone === "confetti"
                      ? `0 1px 4px ${burstPalette[burst.tone][index % burstPalette[burst.tone].length]}66`
                      : `0 0 16px ${burstPalette[burst.tone][index % burstPalette[burst.tone].length]}`,
                  borderRadius: (burst.tone === "rose" || burst.tone === "confetti") && particle.stretchX > 1.4 ? 1.5 : 999,
                }}
                initial={{ x: 0, y: 0, opacity: burst.tone === "confetti" ? 0 : 1, scale: burst.tone === "confetti" ? 0.72 : 1, rotate: 0 }}
                animate={
                  burst.tone === "confetti"
                    ? {
                        x: [0, particle.dx * 0.55, particle.dx],
                        y: [0, particle.lift ?? -58, particle.dy],
                        opacity: [0, 1, 0.9, 0],
                        scale: [0.72, 1, 0.9, 0.18],
                        rotate: [0, particle.rotation * 0.45, particle.rotation],
                      }
                    : {
                        x: particle.dx,
                        y: particle.dy,
                        opacity: 0,
                        scale: burst.tone === "rose" ? 0.08 : 0.2,
                        rotate: particle.rotation,
                      }
                }
                transition={{
                  duration: burst.tone === "confetti" ? 0.98 : burst.tone === "rose" ? 1.18 : 0.78,
                  delay: particle.delay,
                  ease: burst.tone === "confetti" ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1],
                }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
