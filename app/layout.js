import './globals.css'

export const metadata = {
  title: 'Gerador de Relatórios',
  description: 'Gere roteiros e ideias de copy baseados em anúncios de concorrentes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
