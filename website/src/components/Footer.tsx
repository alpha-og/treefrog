import { Github, Heart } from 'lucide-react'

const footerLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Download', href: '#download' },
  { label: 'Documentation', href: 'https://github.com/alpha-og/treefrog#readme' },
  { label: 'Changelog', href: 'https://github.com/alpha-og/treefrog/releases' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Issues', href: 'https://github.com/alpha-og/treefrog/issues' }
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="max-w-6xl mx-auto px-6 py-14">

        {/* Top Section */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">

          {/* Brand */}
          <div className="max-w-sm">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              TreeFrog
            </h2>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Modern LaTeX editing — fast, clean, and frustration-free.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {footerLinks.map(link => {
              const external = link.href.startsWith('http')

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="
                    text-muted-foreground
                    hover:text-foreground
                    transition-colors
                  "
                >
                  {link.label}
                </a>
              )
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className="my-10 border-t border-border/40" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">

          <div className="flex items-center gap-5">
            <span>© {year} TreeFrog</span>

            <a
              href="https://github.com/alpha-og/treefrog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              Source
            </a>
          </div>

          <div className="flex items-center gap-1.5">
            Made with
            <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
            by
            <a
              href="https://github.com/alpha-og"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              alpha-og
            </a>
          </div>

        </div>
      </div>
    </footer>
  )
}

