import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { staggerContainer, staggerItem, buttonHover, easeOutExpo, ANIMATION_DURATIONS } from '../lib/animations'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started',
    features: [
      'Full LaTeX editor',
      'Live PDF preview',
      'Local Docker compilation',
      'Git integration',
      'Community support'
    ],
    cta: 'Download',
    href: '#download',
    featured: false
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For power users and teams',
    features: [
      'Everything in Free',
      'Remote compilation servers',
      'Priority build queue',
      'Priority support',
      'Early access features'
    ],
    cta: 'Start Trial',
    href: '#',
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations',
    features: [
      'Everything in Pro',
      'Self-hosted compiler',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee'
    ],
    cta: 'Contact',
    href: '#',
    featured: false
  }
]

export default function Pricing() {
  return (
    <section id="pricing" className="section-padding bg-muted/30">
      <div className="container-width">
        <motion.div
          className="text-center mb-16"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.p variants={staggerItem} className="text-sm font-medium text-primary mb-3">
            Pricing
          </motion.p>
          <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple pricing
          </motion.h2>
          <motion.p variants={staggerItem} className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when you need more.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`
                relative p-6 rounded-2xl border bg-card
                ${plan.featured 
                  ? 'border-primary/40 ring-1 ring-primary/20 glow-card' 
                  : 'border-border hover-lift'
                }
              `}
              variants={staggerItem}
              initial="rest"
              whileHover="hover"
              custom={i}
            >
              {plan.featured && (
                <motion.div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                >
                  <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/30">
                    Popular
                  </span>
                </motion.div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-1 text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, j) => (
                  <motion.li 
                    key={feature} 
                    className="flex items-center gap-2.5 text-sm text-muted-foreground"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: j * 0.05, duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}
                    viewport={{ once: true }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}
                    >
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    </motion.div>
                    {feature}
                  </motion.li>
                ))}
              </ul>

              <motion.a
                href={plan.href}
                className={`
                  block w-full py-3 rounded-xl text-sm font-medium text-center transition-all duration-300
                  ${plan.featured
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
                    : 'border border-border hover:bg-muted hover:border-border/80'
                  }
                `}
                variants={buttonHover}
                whileHover="hover"
                whileTap="tap"
              >
                {plan.cta}
              </motion.a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
