import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card } from "@/ui/card"

export default function DashboardFeaturesLoading() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Features"
        text="Manage popular streamer features for your Dota game."
      />
      <div className="grid gap-10">
        <Card.Skeleton />
        <Card.Skeleton />
      </div>
    </DashboardShell>
  )
}
