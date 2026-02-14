import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import './index.css'
import { router } from './router'
import { ThemeProvider } from './lib/theme-context'
import { AnimationProvider } from './lib/animation-context'
import { AuthProvider } from './lib/auth'
import { ErrorBoundary } from './components/ErrorBoundary'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AnimationProvider>
              <RouterProvider router={router} />
            </AnimationProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
