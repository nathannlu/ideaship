import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from '../components/PostHogProvider'
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/components/auth/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
// Navbar moved to chat-specific layout

export const metadata: Metadata = {
  title: 'Ideaship',
  description: 'Easily test and iterate ideas as an indiehacker',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Suppress hydration warning for html attributes modified by next-themes script
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <PostHogProvider>
              <main className="min-h-[calc(100vh-4rem)]">
                {children}
              </main>
              <Toaster richColors position="top-center" />
            </PostHogProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
