import { motion } from "motion/react";
import { Eye, GitBranch, Zap, Code2, FileText, Box } from "lucide-react";
import { staggerContainer, staggerItem } from "../lib/animations";

const features = [
  {
    icon: Code2,
    title: "Monaco Editor",
    description:
      "Professional code editing with LaTeX syntax highlighting and intelligent autocompletion.",
  },
  {
    icon: Eye,
    title: "Live Preview",
    description:
      "Real-time PDF viewer with SyncTeX. Click to jump between PDF and source instantly.",
  },
  {
    icon: Zap,
    title: "Remote Compilation",
    description:
      "Offload builds to remote servers. Keep your machine fast and responsive.",
  },
  {
    icon: Box,
    title: "Docker Support",
    description:
      "Optional local compilation via bundled Docker container with one-click setup.",
  },
  {
    icon: GitBranch,
    title: "Git Integration",
    description:
      "Version control built-in. Commit, push, and pull without leaving the editor.",
  },
  {
    icon: FileText,
    title: "Project Management",
    description:
      "Native file browser with full support for multi-file LaTeX projects.",
  },
];

export default function Features() {
  return (
    <section id="features" className="section-padding">
      <div className="container-width">
        <motion.div
          className="text-center mb-16"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.p
            variants={staggerItem}
            className="text-sm font-medium text-primary mb-3"
          >
            Features
          </motion.p>
          <motion.h2
            variants={staggerItem}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
          >
            Everything you need
          </motion.h2>
          <motion.p
            variants={staggerItem}
            className="text-lg text-muted-foreground max-w-xl mx-auto"
          >
            A focused toolset for productive LaTeX writing
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group relative p-6 rounded-2xl border border-border bg-card overflow-hidden cursor-default"
              variants={staggerItem}
              custom={i}
            >
              <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 flex items-start gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <feature.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
