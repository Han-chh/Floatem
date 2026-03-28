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
              className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: burst.tone === "rose" ? 34 : 24,
                height: burst.tone === "rose" ? 34 : 24,
                background: `radial-gradient(circle, ${burstPalette[burst.tone][0]} 0%, rgba(255,255,255,0) 70%)`,
              }}
              initial={{ scale: 0.3, opacity: 0.7 }}
              animate={{ scale: burst.tone === "rose" ? 2.4 : 1.8, opacity: 0 }}
              transition={{ duration: burst.tone === "rose" ? 0.68 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
            {burst.tone === "rose" ? (
              <motion.span
                className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{
                  width: 22,
                  height: 22,
                  borderColor: "rgba(240,165,143,0.8)",
                }}
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 2.8, opacity: 0 }}
                transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
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
                  boxShadow: `0 0 16px ${burstPalette[burst.tone][index % burstPalette[burst.tone].length]}`,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                animate={{
                  x: particle.dx,
                  y: particle.dy,
                  opacity: 0,
                  scale: 0.2,
                  rotate: particle.rotation,
                }}
                transition={{
                  duration: burst.tone === "rose" ? 0.92 : 0.78,
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
