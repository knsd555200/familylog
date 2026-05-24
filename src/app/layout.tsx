import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: '패밀로그 — 우리 가정의 이야기를 남기는 곳',
  description: '가정들이 일상을 기록하고 성장 궤적을 쌓는 커뮤니티 웹 플랫폼.',
  keywords: '패밀로그, 가정, 부부, 자녀교육, 가족커뮤니티',
  icons: {
    icon: '/familog_logo_가로.png',
    shortcut: '/familog_logo_가로.png',
    apple: '/familog_logo_가로.png',
  },
  openGraph: {
    title: '패밀로그',
    description: '우리 가정의 이야기를 남기는 곳',
    type: 'website',
    images: [{ url: '/familog_logo_가로.png', width: 512, height: 512, alt: '패밀로그 로고' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-brand-bg text-brand-text antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
