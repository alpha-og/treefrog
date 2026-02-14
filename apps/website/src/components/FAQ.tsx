import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { staggerContainer, staggerItem, easeOutExpo, ANIMATION_DURATIONS } from '../lib/animations'

const faqs = [
  {
    question: 'Is TreeFrog free?',
    answer: 'Yes, completely free and open source under the MIT license. The codebase is available on GitHub.'
  },
  {
    question: 'What platforms are supported?',
    answer: 'TreeFrog runs natively on macOS, Windows, and Linux via Wails v2.'
  },
  {
    question: 'Do I need LaTeX installed?',
    answer: 'Not required. Use remote compilation or the bundled Docker container for local builds.'
  },
  {
    question: 'Can I use existing projects?',
    answer: 'Yes. Open any standard LaTeX project folder and start editing immediately.'
  },
  {
    question: 'How does remote compilation work?',
    answer: 'Configure a compiler URL in settings. TreeFrog uploads, compiles remotely, and returns the PDF.'
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="section-padding bg-muted/30">
      <div className="container-width max-w-2xl">
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.p variants={staggerItem} className="text-sm font-medium text-primary mb-3">
            FAQ
          </motion.p>
          <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Common questions
          </motion.h2>
        </motion.div>

        <motion.div
          className="space-y-3"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="rounded-2xl border border-border bg-card overflow-hidden hover-lift"
              variants={staggerItem}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-muted/50"
              >
                <span className="font-medium text-foreground pr-4">{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                  className="flex-shrink-0 text-muted-foreground"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>

              <AnimatePresence mode="wait">
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ 
                      height: { duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo },
                      opacity: { duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }
                    }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
