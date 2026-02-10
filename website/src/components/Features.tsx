import { motion } from 'motion/react'
import { Eye, GitBranch, Zap, Code2, FileText, Box } from 'lucide-react'

const features = [
  {
    icon: Code2,
    title: 'Monaco Editor',
    description: 'Professional code editing with full LaTeX syntax highlighting and intelligent autocompletion.'
  },
  {
    icon: Eye,
    title: 'Live PDF Preview',
    description: 'Real-time PDF viewer with SyncTeX support. Click in PDF to jump to source code instantly.'
  },
  {
    icon: Zap,
    title: 'Remote Compilation',
    description: 'Offload LaTeX builds to remote servers. Keep your laptop fast and cool.'
  },
  {
    icon: Box,
    title: 'Local Docker Renderer',
    description: 'Optional bundled Docker container for local LaTeX compilation with one-click setup.'
  },
  {
    icon: GitBranch,
    title: 'Git Integration',
    description: 'Built-in version control. View status, commit, push, and pull without leaving the editor.'
  },
  {
    icon: FileText,
    title: 'Project Management',
    description: 'Native file browser with full support for multi-file LaTeX projects and dependencies.'
  }
]

export default function Features() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <motion.div
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Everything you need
          </h2>
          <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto">
            A modern LaTeX editor built for productivity
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="flex flex-col h-full p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/50 hover:shadow-lg hover:shadow-primary/5">

                {/* Icon */}
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
                    <feature.icon className="w-6 h-6" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground/80 text-[15px] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
