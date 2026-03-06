import './globals.css'

export const metadata = {
  title: 'Launchpad — AI Job Search Assistant',
  description: 'Wake up to tailored job matches, customized resumes, and drafted outreach. Every morning.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
