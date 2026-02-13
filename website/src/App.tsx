import Hero from './components/Hero'
import Header from './components/Header'
import Features from './components/Features'
import Pricing from './components/Pricing'
import FAQ from './components/FAQ'
import DownloadSection from './components/Downloads'
import Footer from './components/Footer'
import { ThemeProvider } from './lib/theme-context'
import { AnimationProvider } from './lib/animation-context'

function App() {
  return (
    <ThemeProvider>
      <AnimationProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <Hero />
          <Features />
          <Pricing />
          <DownloadSection />
          <FAQ />
          <Footer />
        </div>
      </AnimationProvider>
    </ThemeProvider>
  )
}

export default App
