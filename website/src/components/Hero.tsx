import { motion } from 'motion/react'
import { ArrowRight, Github } from 'lucide-react'
import { fadeIn, staggerContainer, staggerItem, buttonHover, easeOutExpo, ANIMATION_DURATIONS } from '../lib/animations'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      <div className="absolute inset-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: easeOutExpo }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: easeOutExpo }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" 
        />
      </div>

      <div className="container-width relative z-10">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem} className="mb-6">
            <motion.span 
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/50 text-xs font-medium text-muted-foreground"
              whileHover={{ scale: 1.02, borderColor: 'var(--border)' }}
              transition={{ duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Open Source LaTeX Editor
            </motion.span>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6"
          >
            Write LaTeX with
            <motion.span 
              className="block text-primary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: ANIMATION_DURATIONS.slow, ease: easeOutExpo }}
            >
              clarity and speed
            </motion.span>
          </motion.h1>

          <motion.p
            variants={staggerItem}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A modern desktop editor with live preview, remote compilation, and seamless Git integration. Built for researchers, academics, and developers.
          </motion.p>

          <motion.div
            variants={staggerItem}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.a
              href="#download"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/20"
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
            >
              Download for Free
              <ArrowRight className="w-4 h-4" />
            </motion.a>

            <motion.a
              href="https://github.com/alpha-og/treefrog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-border hover:bg-muted hover:border-border/80 transition-all duration-300 font-medium"
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
            >
              <Github className="w-4 h-4" />
              View Source
            </motion.a>
          </motion.div>

          <motion.div
            variants={fadeIn}
            className="mt-14 flex items-center justify-center gap-8 text-sm text-muted-foreground"
          >
            {['macOS', 'Windows', 'Linux'].map((platform, i) => (
              <motion.span 
                key={platform}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                className="flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                {platform}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
