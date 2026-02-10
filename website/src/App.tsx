import './App.css'
import Hero from './components/Hero'
import Features from './components/Features'
import FAQ from './components/FAQ'
import DownloadSection from './components/Downloads'
import Footer from './components/Footer'

function App() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <DownloadSection />
      <FAQ />
      <Footer />
    </main>
  )
}

export default App
