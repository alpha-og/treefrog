import { motion } from "motion/react";
import { Github } from "lucide-react";
import {
  staggerContainer,
  staggerItem,
  easeOutExpo,
  ANIMATION_DURATIONS,
} from "../lib/animations";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container-width py-12">
        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <motion.a
            href="#"
            className="flex items-center gap-3"
            variants={staggerItem}
            whileHover={{ scale: 1.02 }}
            transition={{
              duration: ANIMATION_DURATIONS.fast,
              ease: easeOutExpo,
            }}
          >
            <img
              src="/appicon.png"
              alt="TreeFrog"
              className="w-7 h-7 rounded-lg"
            />
            <span className="font-semibold text-foreground">TreeFrog</span>
          </motion.a>

          <motion.div
            variants={staggerItem}
            className="flex items-center gap-4 text-sm text-muted-foreground"
          >
            <span>© {year}</span>
            <motion.a
              href="https://github.com/alpha-og/treefrog"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{
                duration: ANIMATION_DURATIONS.fast,
                ease: easeOutExpo,
              }}
            >
              <Github className="w-4 h-4" />
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}
