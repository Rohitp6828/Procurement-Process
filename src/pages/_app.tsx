import '../app/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div style={{ fontFamily: "'Inter', sans-serif", color: '#1e1e1e' }}>
        <Component {...pageProps} />
      </div>
    </>
  )
}