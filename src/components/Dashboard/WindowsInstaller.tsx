'use client'

import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Stepper } from '@/components/ui/stepper'
import CodeBlock from './CodeBlock'

const InstallationSteps = ({ success, currentStep, errorWithoutSuccess }) => {
  const steps = [
    {
      title: !errorWithoutSuccess
        ? 'Connection check'
        : 'Connection check failed',
      content: errorWithoutSuccess ? (
        <p>Please try again or reach out on Discord for more help.</p>
      ) : (
        <div>
          <p>Run the script above to connect to the Dotabod installer!</p>
          {currentStep === 0 && (
            <video
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-auto max-w-3xl"
            >
              <source
                src="/images/setup/how-to-automated-install.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      ),
    },
    {
      title: 'Process Token',
      content: <p>Processing the provided token...</p>,
    },
    {
      title: 'Install Dotabod',
      content: <p>Running the installer script</p>,
    },
  ]

  return <Stepper steps={steps} currentStep={currentStep} onChange={() => {}} />
}

const WindowsInstaller = () => {
  const router = useRouter()
  const session = useSession()
  const port = Number.parseInt(router.query.port as string, 10)
  const sanitizedPort = Number.isNaN(port)
    ? 8089
    : Math.min(Math.max(port, 8000), 9000)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const errorWithoutSuccess = error && !success

  useEffect(() => {
    const channel = new BroadcastChannel('single-instance-check')
    const handleMessage = (event) => {
      if (event.data === 'instance-opened') {
        router.replace('/404')
      }
    }

    channel.addEventListener('message', handleMessage)
    channel.postMessage('instance-opened')

    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [router])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (!success && !error && sanitizedPort) {
      const fetchToken = async () => {
        try {
          const response = await fetch(
            `http://localhost:${sanitizedPort}/token?token=${encodeURIComponent(session.data?.user.id)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          )
          if (!response.ok) {
            throw new Error('Network response was not ok')
          }
          setCurrentStep(2)
          setSuccess(true)
          setTimeout(() => {
            setCurrentStep(3)
          }, 3000)
        } catch (error) {
          // Do nothing
        }
      }

      interval = setInterval(async () => {
        try {
          const response = await fetch(
            `http://localhost:${sanitizedPort}/status`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          )
          if (response.ok) {
            fetchToken()
            setError(null)
            clearInterval(interval)
          }
        } catch (err) {
          // Do nothing
        }
      }, 3000)
    }
    return () => {
      clearInterval(interval)
    }
  }, [success, error, sanitizedPort, session?.data?.user?.id])

  return (
    <div className="space-y-6">
      <p className="font-medium">
        <strong>Why?</strong> This step is necessary to ensure that Dota 2 knows
        which data Dotabod requires. It&apos;s a Valve approved way of getting
        game data.
      </p>
      <div className="flex justify-center">
        <CodeBlock />
      </div>
      <div className="mb-4">
        <InstallationSteps
          success={success}
          errorWithoutSuccess={errorWithoutSuccess}
          currentStep={currentStep}
        />
      </div>
      {success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            The Dotabod installer is running! You can continue on to the next
            step.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center space-x-2">
        <HelpCircle className="h-4 w-4" />
        <p>
          Having trouble? Let us know what happened{' '}
          <Link
            href="https://help.dotabod.com"
            className="font-medium underline"
            target="_blank"
          >
            on Discord
          </Link>
          , and then try{' '}
          <Link
            href="/dashboard?step=2&gsiType=manual"
            className="font-medium underline"
          >
            the manual steps
          </Link>
          .
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>An error occurred: {error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default WindowsInstaller
