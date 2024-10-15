import type { useTrack } from '@/lib/track'
import { Button } from 'antd'
import type { ArgsProps } from 'antd/es/notification'

export const APRIL_2024_MSG = (
  track: ReturnType<typeof useTrack>
): ArgsProps => ({
  key: 'important-update',
  type: 'error',
  duration: 0,
  placement: 'bottomLeft',
  message: 'Important Update for users who signed up after April 2024',
  btn: (
    <Button
      target="_blank"
      onClick={() => track('important_update_read_more', { page: 'dashboard' })}
      href="https://x.com/dotabod_/status/1845898112054730842"
    >
      Read more
    </Button>
  ),
  description:
    "Due to a recent database issue affecting 6,000+ users, if you're experiencing overlay issues, please log in again and set up your account.",
})
