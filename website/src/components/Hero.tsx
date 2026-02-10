import { motion } from 'motion/react'
import { Download, ArrowRight } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative flex items-center justify-center min-h-[92vh] border-b border-border/40">

      {/* Subtle background depth */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
        <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 bg-primary/5 blur-3xl rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-24 text-center">

        {/* Product label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-sm text-muted-foreground tracking-wide"
        >
          TreeFrog — Desktop LaTeX Editor
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="
            text-4xl
            sm:text-5xl
            md:text-6xl
            lg:text-[4.25rem]
            font-semibold
            tracking-tight
            leading-[1.08]
            text-foreground
          "
        >
          Write LaTeX
          <br />
          without friction
        </motion.h1>

        {/* Supporting statement */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="
            mt-6
            mx-auto
            max-w-xl
            text-lg
            text-muted-foreground
            leading-relaxed
          "
        >
          Real-time preview, remote compilation, and Git-native workflows —
          designed for focus and speed.
        </motion.p>

        {/* CTA Block */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Primary */}
          <motion.a
            href="#download"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="
              inline-flex items-center gap-2
              px-7 py-3
              rounded-lg
              bg-primary
              text-primary-foreground
              text-sm font-medium
              shadow-sm
              hover:shadow-md
              transition-all
            "
          >
            <Download className="w-4 h-4" />
            Download
          </motion.a>

          {/* Secondary */}
          <motion.a
            href="https://github.com/alpha-og/treefrog"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="
              group inline-flex items-center gap-2
              px-6 py-3
              text-sm font-medium
              text-foreground/80
              hover:text-foreground
              transition-colors
            "
          >
            View source
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </motion.a>
        </motion.div>

        {/* Platform hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-muted-foreground"
        >
          macOS · Windows · Linux
        </motion.div>

      </div>
    </section>
  )
}

