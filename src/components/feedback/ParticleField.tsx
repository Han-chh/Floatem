import { AnimatePresence, motion } from "framer-motion";
import type { BurstTone, ParticleBurst } from "../../hooks/useParticleField";

type ParticleFieldProps = {
  bursts: ParticleBurst[];
};

const burstPalette: Record<BurstTone, string[]> = {
  amber: ["#f7d6a8", "#d8b07b", "#be6f47"],
  green: ["#c4e0ca", "#8fbd98", "#6f9b76"],
  rose: ["#ffd7cd", "#f0a58f", "#cb7a63"],
  paper: ["#fff9ef", "#f2e0c7", "#d6b48a"],
};

export function ParticleField({ bursts }: ParticleFieldProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => (
          <motion.div
            key={burst.id}
            initial={{ opacity: 1, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute"
            style={{ left: burst.x, top: burst.y }}
          >
            <motion.span
              className="absolute left-0 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: `radial-gradient(circle, ${burstPalette[burst.tone][0]} 0%, rgba(255,255,255,0) 70%)`,
              }}
              initial={{ scale: 0.3, opacity: 0.7 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />

            {burst.particles.map((particle, index) => (
              <motion.span
                key={particle.id}
                className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: burstPalette[burst.tone][index % burstPalette[burst.tone].length],
                  boxShadow: `0 0 16px ${burstPalette[burst.tone][index % burstPalette[burst.tone].length]}`,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: particle.dx,
                  y: particle.dy,
                  opacity: 0,
                  scale: 0.2,
                }}
                transition={{
                  duration: 0.78,
                  delay: particle.delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
