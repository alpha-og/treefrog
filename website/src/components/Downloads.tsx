import { motion } from 'motion/react'
import { Download, Apple, Monitor } from 'lucide-react'

const downloads = [
  {
    platform: 'macOS',
    icon: Apple,
    version: 'Apple Silicon & Intel',
    size: 'v0.0.4',
    link: 'https://github.com/alpha-og/treefrog/releases/latest/download/treefrog-macos-universal.dmg'
  },
  {
    platform: 'Windows',
    icon: Monitor,
    version: 'Windows 10+',
    size: 'v0.0.4',
    link: 'https://github.com/alpha-og/treefrog/releases/latest/download/treefrog-windows-x64.zip '
  },
  {
    platform: 'Linux',
    icon: Monitor,
    version: 'AppImage',
    size: 'v0.0.4',
    link: 'https://github.com/alpha-og/treefrog/releases/latest/download/treefrog-linux-x86_64.tar.gz '
  }
]

export default function DownloadSection() {
  return (
    <section id="download" className="relative py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Download TreeFrog
          </h2>
          <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto">
            Choose your platform and start writing in seconds
          </p>
        </motion.div>

        {/* Download cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {downloads.map((download, index) => (
            <motion.a
              key={download.platform}
              href={download.link}
              download
              className="group block p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/50 hover:shadow-lg hover:shadow-primary/5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-colors duration-300 group-hover:bg-primary/15">
                  <download.icon className="w-7 h-7" />
                </div>

                {/* Platform name */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {download.platform}
                  </h3>
                  <p className="text-sm text-muted-foreground/70">
                    {download.version}
                  </p>
                </div>

                {/* Download button */}
                <div className="w-full pt-2">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:text-primary/80 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>{download.size}</span>
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Alternative options */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="text-sm text-muted-foreground/70">
            <a
              href="https://github.com/alpha-og/treefrog/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              View all releases
            </a>
            {' · '}
            <a
              href="https://github.com/alpha-og/treefrog#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Build from source
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
