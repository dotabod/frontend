import type { NextPage } from 'next'

import { Container } from '@/components/Container'
import Home from '@/components/Homepage/Home'
import { Alert } from 'antd'

const Maintenance: NextPage = () => {
  return (
    <Home>
      <Container className="py-24">
        <Alert
          description="Dotabod is temporarily offline for everyone. We are currently undergoing scheduled maintenance. Please check back later."
          message="Scheduled Maintenance"
          type="warning"
          showIcon
        />
      </Container>
    </Home>
  )
}

export default Maintenance
