export const metadata = {
  title: 'Signal vs Noise - AI Fact Checker',
  description: 'Stop falling for fake news. Fact-check any claim in seconds with AI-powered analysis.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
