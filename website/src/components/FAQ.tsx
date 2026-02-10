import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    question: 'Is TreeFrog really free?',
    answer: 'Yes, completely free and open source. Released under the MIT license, the entire codebase is available on GitHub for you to use, modify, and distribute.'
  },
  {
    question: 'What platforms are supported?',
    answer: 'TreeFrog runs natively on macOS, Windows, and Linux. Built with Wails v2, it provides a true native desktop experience on all platforms.'
  },
  {
    question: 'Do I need to install LaTeX separately?',
    answer: 'Not necessarily. TreeFrog supports both remote compilation (no local LaTeX needed) and local Docker rendering with a bundled LaTeX distribution. Choose what works best for you.'
  },
  {
    question: 'Can I use my existing LaTeX projects?',
    answer: 'Absolutely. TreeFrog works seamlessly with standard LaTeX files and project structures. Just open your existing project folder and start editing.'
  },
  {
    question: 'How does remote compilation work?',
    answer: 'Configure a remote compiler URL and API token in Settings. TreeFrog uploads your project, compiles it on the server, and displays the PDF. This keeps your machine fast and requires no local LaTeX installation.'
  },
  {
    question: 'What is the Docker renderer option?',
    answer: 'An optional local LaTeX compilation environment that runs in Docker. One-click start/stop, automatic port management, and built-in health checks. Perfect for offline work or when you prefer local compilation.'
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="relative py-24 sm:py-32 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Questions?
          </h2>
          <p className="text-lg text-muted-foreground/80">
            Everything you need to know
          </p>
        </motion.div>

        {/* FAQ items */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left p-5 rounded-lg bg-card border border-border/50 hover:border-border transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-medium text-foreground pr-4">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 mt-1"
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-muted-foreground/80 text-[15px] leading-relaxed mt-3 pr-8">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
