import DashboardShell from '@/components/Dashboard/DashboardShell'
import ModeratedChannels from '@/components/Dashboard/ModeratedChannels'
import { requireDashboardAccess } from '@/lib/server/dashboardAccess'
import { Card } from '@/ui/card'

const ManageChannel = () => {
  return (
    <Card title='Manage Channel'>
      <p className='text-sm text-gray-500'>Search for a channel to manage.</p>
      <ModeratedChannels />
    </Card>
  )
}

ManageChannel.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <DashboardShell
      seo={{
        title: 'Manage Channel | Dotabod Dashboard',
        description: 'Manage the channel for a Dotabod user.',
        canonicalUrl: 'https://dotabod.com/dashboard/admin/manage-channel',
        noindex: true,
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess({ requireAdmin: true })

export default ManageChannel
