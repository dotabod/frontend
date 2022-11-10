import { DashboardHeader } from '@/components/dashboard-header'
import { DashboardShell } from '@/components/dashboard-shell'
import { Card } from '@/ui/card'

export default function DashboardLoading() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Setup" text="Browser overlays for your OBS." />
      <div className="grid gap-10">
        <Card.Skeleton />
        <Card.Skeleton />
      </div>
    </DashboardShell>
  )
}
