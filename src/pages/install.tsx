import HomepageShell from '@/components/Homepage/HomepageShell'
import { Alert, Spin } from 'antd'
import { Steps } from 'antd'
import { getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { type ReactElement, useEffect, useState } from 'react'

const { Step } = Steps

const InstallationSteps = ({ currentStep }) => {
  const steps = [
    {
      title: 'Check Status',
      description: 'Checking connection to Dotabod installer...',
    },
    {
      title: 'Process Token',
      description: 'Processing the provided token...',
    },
    {
      title: 'Install Dotabod',
      description:
        'Running the installer script! You can now close this window.',
    },
  ]

  return (
    <Steps direction="vertical" current={currentStep}>
      {steps.map((step, index) => (
        <Step
          key={index}
          title={step.title}
          description={step.description}
          status={
            currentStep > index
              ? 'finish'
              : currentStep === index
                ? 'process'
                : 'wait'
          }
        />
      ))}
    </Steps>
  )
}

function InstallPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:8089/status')
        if (!response.ok) {
          throw new Error('Status check failed')
        }
        setCurrentStep(1)
        return true
      } catch (error) {
        console.error('Failed to check status:', error)
        setError(
          'Could not connect to the Dotabod installer. Please try again, or reach out on Discord for more help.'
        )
        return false
      }
    }

    const fetchToken = async () => {
      setLoading(true)
      const session = await getSession()
      if (!session) {
        router.push('/api/auth/signin?callbackUrl=/install')
      } else {
        const token = session.user.id
        try {
          const statusOk = await checkStatus()
          if (!statusOk) return

          const response = await fetch(
            `http://localhost:8089/token?token=${token}`
          )
          if (!response.ok) {
            throw new Error('Network response was not ok')
          }
          setCurrentStep(2)
          setSuccess(true)
        } catch (error) {
          setError(
            'Could not install Dotabod. Please try again, or reach out on Discord for more help.'
          )
        } finally {
          setLoading(false)
        }
      }
    }

    fetchToken()
  }, [])

  useEffect(() => {
    if (!success && !error) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('http://localhost:8089/install_status')
          if (response.ok) {
            const data = await response.json()
            if (data.status === 'success') {
              setCurrentStep(3)
              setSuccess(true)
              setError(null)
            } else if (data.status === 'error') {
              setError(data.message)
              setSuccess(false)
            }
          }
        } catch (error) {
          console.error('Failed to fetch install status:', error)
        }
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [success, error])

  useEffect(() => {
    if (success) {
      const timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            clearInterval(timer)
            window.close()
            return 0
          }
          return prevCountdown - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [success])

  return (
    <div className="px-12">
      <div className="mb-4">
        <InstallationSteps currentStep={currentStep} />
      </div>
      {loading && !success && (
        <div className="flex items-center space-x-4">
          <Spin spinning={loading} />
          <span>Waiting to connect to the Dotabod installer...</span>
        </div>
      )}
      {error && !success && (
        <Alert className="max-w-2xl" message={error} type="warning" showIcon />
      )}
      {success && (
        <Alert
          className="max-w-2xl"
          message={`The Dotabod installer is running! This window will close in ${countdown} seconds.`}
          type="success"
          showIcon
        />
      )}
    </div>
  )
}

InstallPage.getLayout = function getLayout(page: ReactElement) {
  return <HomepageShell title="Dotabod - Installer">{page}</HomepageShell>
}

export default InstallPage
