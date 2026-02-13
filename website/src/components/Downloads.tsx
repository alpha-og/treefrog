import { motion } from 'motion/react'
import { Download } from 'lucide-react'
import { staggerContainer, staggerItem } from '../lib/animations'

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const WindowsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
  </svg>
)

const LinuxIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.2.458.342.289.607.44.867.502.332.072.602.008.905-.065.2-.046.4-.092.602-.092h.008c.265 0 .532.066.733.265.266.265.333.465.333.664 0 .202-.065.4-.2.536-.202.2-.466.265-.733.265-.267 0-.532-.065-.8-.135-.266-.065-.53-.135-.796-.135h-.01c-.266 0-.532.07-.8.135-.266.07-.531.135-.797.135-.267 0-.532-.065-.733-.265-.202-.2-.267-.4-.267-.6s.065-.4.2-.535c.2-.2.465-.265.73-.265.267 0 .533.065.8.135.267.065.533.13.8.13.266 0 .532-.065.733-.265.135-.135.2-.333.2-.535 0-.2-.065-.4-.2-.535-.202-.2-.467-.265-.734-.265-.266 0-.532.07-.798.135-.267.065-.532.135-.8.135-.266 0-.532-.065-.733-.265-.135-.135-.2-.333-.2-.535 0-.2.065-.4.2-.535.202-.2.467-.265.734-.265.266 0 .533.07.798.135.267.065.532.13.8.13.265 0 .532-.065.733-.265.135-.135.2-.333.2-.535 0-.2-.065-.4-.2-.535-.202-.2-.468-.265-.734-.265h-.008c-.266 0-.532.07-.798.135-.267.065-.532.135-.8.135-.266 0-.531-.065-.732-.265-.135-.135-.2-.333-.2-.535 0-.2.065-.4.2-.535.2-.2.466-.265.732-.265.267 0 .533.07.8.135.266.065.53.13.797.13.267 0 .532-.065.733-.265.135-.135.2-.333.2-.535 0-.2-.065-.4-.2-.535-.202-.2-.466-.265-.733-.265-.267 0-.533.07-.8.135-.266.065-.531.135-.798.135-.266 0-.532-.065-.733-.265-.135-.135-.2-.333-.2-.535 0-.2.065-.4.2-.535.202-.2.467-.265.733-.265z"/>
  </svg>
)

const downloads = [
  {
    platform: 'macOS',
    Icon: AppleIcon,
    version: 'Apple Silicon & Intel',
    link: 'https://github.com/alpha-og/treefrog/releases/latest/download/treefrog-macos-universal.dmg'
  },
  {
    platform: 'Windows',
    Icon: WindowsIcon,
    version: 'Windows 10+',
    link: 'https://github.com/alpha-og/treefrog/releases/latest/download/treefrog-windows-x64.zip'
  },
  {
    platform: 'Linux',
    Icon: LinuxIcon,
    version: 'AppImage',
    link: 'https://github.com/alpha-og/treefrog/releases/latest/download/treefrog-linux-x86_64.tar.gz'
  }
]

export default function DownloadSection() {
  return (
    <section id="download" className="section-padding">
      <div className="container-width">
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.p variants={staggerItem} className="text-sm font-medium text-primary mb-3">
            Download
          </motion.p>
          <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Get TreeFrog
          </motion.h2>
          <motion.p variants={staggerItem} className="text-lg text-muted-foreground">
            Available for all major platforms
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          {downloads.map((download, i) => (
            <motion.a
              key={download.platform}
              href={download.link}
              className="group relative p-6 rounded-2xl border border-border bg-card hover-lift text-center overflow-hidden"
              variants={staggerItem}
              custom={i}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    <download.Icon />
                  </div>
                </div>
                
                <h3 className="font-semibold text-foreground mb-1 text-lg">{download.platform}</h3>
                <p className="text-sm text-muted-foreground mb-4">{download.version}</p>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Download className="w-4 h-4" />
                  Download
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          className="mt-10 text-center text-sm text-muted-foreground"
          variants={staggerItem}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <a
            href="https://github.com/alpha-og/treefrog/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            View all releases
          </a>
          <span className="mx-3 text-border">·</span>
          <a
            href="https://github.com/alpha-og/treefrog#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Build from source
          </a>
        </motion.div>
      </div>
    </section>
  )
}
