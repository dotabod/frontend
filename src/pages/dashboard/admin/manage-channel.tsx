import DashboardShell from '@/components/Dashboard/dashboard-shell'
import ModeratedChannels from '@/components/Dashboard/moderated-channels'
import { requireDashboardAccess } from '@/lib/server/dashboard-access'
import { Card } from '@/ui/card'

const ManageChannel = () => (
  <Card title='Manage Channel'>
    <p className='text-sm text-gray-500'>Search for a channel to manage.</p>
    <ModeratedChannels />
  </Card>
)

ManageChannel.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <DashboardShell
      seo={{
        canonicalUrl: 'https://dotabod.com/dashboard/admin/manage-channel',
        description: 'Manage the channel for a Dotabod user.',
        noindex: true,
        title: 'Manage Channel | Dotabod Dashboard',
      }}
    >
      {page}
    </DashboardShell>
  )
}

export const getServerSideProps = requireDashboardAccess({ requireAdmin: true })

export default ManageChannel
