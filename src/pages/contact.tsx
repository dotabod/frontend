import { MessageOutlined } from '@ant-design/icons'
import { Button, Divider, Form, Input, message } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import type React from 'react'
import { useEffect, useState } from 'react'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { Card } from '@/ui/card'

// Define form values interface
interface ContactFormValues {
  email: string
  message: string
}

const ContactPage: React.FC = () => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState(false)
  const { data: session } = useSession()

  // Effect to set email field value when session loads
  useEffect(() => {
    if (session?.user?.email) {
      form.setFieldsValue({ email: session.user.email })
    }
    // Re-run effect if session email or form instance changes
  }, [session?.user?.email, form])

  // Function to handle form submission to HubSpot
  const handleSubmit = async (values: ContactFormValues) => {
    setSubmitting(true)
    try {
      // TODO: Replace with your actual HubSpot portal and form IDs
      const portalId = '39771134'
      const formId = 'a394f067-5026-42bd-8e2d-c556ffd6499f'
      const hubspotEndpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`

      // Prepare the data for HubSpot
      // Note: HubSpot field names might be 'email', 'content' etc. Adjust as needed.
      const data = {
        context: {
          pageName: 'Dotabod Contact Us', // Or a more specific name if needed
          pageUri: window.location.href,
        },
        fields: [
          {
            name: 'email',
            value: values.email || session?.user?.email || session?.user?.name,
          },
          {
            name: 'TICKET.subject',
            value: 'Contact Us',
          },
          {
            name: 'TICKET.content',
            value: values.message || '',
          },
        ],
      }

      // Submit to HubSpot
      await axios.post(hubspotEndpoint, data)

      // Show success message
      message.success('Your message has been sent! We will get back to you soon.')
      form.resetFields()
    } catch (error) {
      console.error('Error submitting contact form:', error)
      message.error('There was an error submitting your message. Please try again later.')

      // Optional: Check for specific errors like network errors
      if (axios.isAxiosError(error) && error.message?.includes('Network Error')) {
        message.warning(
          'This might be due to network issues or ad blockers preventing the submission.',
        )
      } else if (axios.isAxiosError(error) && error.response) {
        // Log more specific HubSpot API errors if available
        console.error('HubSpot API Error Response:', error.response.data)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Function to toggle HubSpot chat widget
  const openChatWidget = () => {
    const widget = window.HubSpotConversations?.widget

    if (widget) {
      try {
        if (isChatWidgetOpen) {
          widget.close()
          setIsChatWidgetOpen(false)
        } else {
          // The widget loads lazily (loadImmediately: false), so load+open covers
          // The not-yet-loaded case; open() handles the already-loaded case.
          widget.load({ widgetOpen: true })
          widget.open()
          setIsChatWidgetOpen(true)
        }
      } catch (error) {
        console.error('Error toggling HubSpot chat widget:', error)
        // Attempt to open as a fallback if toggle fails
        try {
          widget.open()
          setIsChatWidgetOpen(true) // Assume opened on fallback
        } catch (openError) {
          console.error('Error opening HubSpot chat widget after toggle failed:', openError)
          message.error('Could not open chat support.')
          setIsChatWidgetOpen(false) // Reset state if fallback open fails
        }
      }
    } else {
      // HubSpot script not loaded or widget not ready
      console.warn('HubSpot Conversations script not loaded yet or widget not ready.')
      message.error(
        'Chat support is unavailable at the moment. It might be blocked by your browser or extensions.',
      )
      setIsChatWidgetOpen(false) // Ensure state is false if widget isn't available
    }
  }

  return (
    <HomepageShell
      seo={{
        canonicalUrl: 'https://dotabod.com/contact', // Assuming this is the canonical URL
        description: 'Get in touch with the Dotabod team. Send us your questions or feedback.',
        noindex: false, // Make sure search engines can index this page if desired
        title: 'Contact Us | Dotabod',
      }}
    >
      <div className='container mx-auto px-4 py-8 md:py-16'>
        <div className='max-w-2xl mx-auto'>
          <h1 className='text-3xl font-bold text-center text-white mb-8'>Contact Us</h1>
          <Card className='p-6 md:p-8 bg-gray-700 border border-gray-600'>
            <Form
              form={form}
              layout='vertical'
              onFinish={handleSubmit}
              className='gap-4 flex flex-col'
              requiredMark={false} // Optional: hide default required marks
            >
              <Form.Item
                name='email'
                label={<span className='text-gray-200'>Email</span>}
                rules={[
                  { message: 'Please enter your email address', required: true },
                  { message: 'Please enter a valid email address', type: 'email' },
                ]}
              >
                <Input placeholder='your.email@example.com' type='email' size='large' />
              </Form.Item>
              <Form.Item
                name='message'
                label={<span className='text-gray-200'>Message</span>}
                rules={[
                  {
                    message: 'Please enter your message - we need details to help you effectively',
                    required: true,
                  },
                  {
                    message:
                      'Please provide more details about your issue (at least 80 characters)',
                    min: 80,
                  },
                  {
                    validator: (_, value) => {
                      if (!value) {
                        return Promise.resolve()
                      }
                      const wordCount = (value as string)
                        .trim()
                        .split(/\s+/)
                        .filter((word) => word.length > 0).length
                      if (wordCount < 2) {
                        return Promise.reject(new Error('Message must contain at least 2 words'))
                      }
                      return Promise.resolve()
                    },
                  },
                ]}
              >
                <Input.TextArea placeholder='Describe your inquiry here...' rows={5} size='large' />
              </Form.Item>

              <Form.Item>
                <div className='flex flex-wrap gap-3 items-center justify-center sm:justify-start'>
                  <Button type='primary' htmlType='submit' loading={submitting} size='large'>
                    Send Message
                  </Button>
                  <Divider type='vertical' className='hidden sm:inline-block' />
                  <Button
                    icon={<MessageOutlined />}
                    onClick={openChatWidget}
                    type='default'
                    size='large'
                  >
                    Live Chat Support
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </div>
    </HomepageShell>
  )
}

export default ContactPage
