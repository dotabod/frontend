import HomepageShell from '@/components/Homepage/HomepageShell'
import { useTrack } from '@/lib/track'
import type { NextPageWithLayout } from '@/pages/_app'
import DOMPurify from 'dompurify'
import { useRouter } from 'next/router'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'

const AuthErrorPage: NextPageWithLayout = () => {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const track = useTrack()

  useEffect(() => {
    if (errorMessage) track('auth_error', { error: errorMessage })
  }, [track, errorMessage])

  useEffect(() => {
    if (router.query.error) {
      const errorParam = Array.isArray(router.query.error)
        ? router.query.error[0]
        : router.query.error
      const decodedError = decodeURIComponent(errorParam)
      const sanitizedError = DOMPurify.sanitize(decodedError, {
        USE_PROFILES: { html: false },
      })
      setErrorMessage(sanitizedError)
    }
  }, [router.query.error])

  return (
    <div
      className="grid grid-cols-1 grid-rows-[1fr,auto,1fr lg:grid-cols-[max(50%,36rem),1fr]"
      style={{
        minHeight: 'inherit',
      }}
    >
      <main className="mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:px-8">
        <div className="max-w-lg">
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Error
          </h1>
          {errorMessage && (
            <p
              className="mt-6 text-base leading-7"
              dangerouslySetInnerHTML={{ __html: errorMessage }}
            />
          )}
          <div className="mt-10">
            <a href="/" className="text-sm font-semibold leading-7">
              <span aria-hidden="true">&larr;</span> Back to home
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

AuthErrorPage.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell>{page}</HomepageShell>
}

export default AuthErrorPage
