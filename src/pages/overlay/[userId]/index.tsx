import type { GetServerSideProps } from 'next'
import MainOverlay from '@/components/Overlay'
import { getOverlayMaintenanceProps } from '@/lib/server/maintenance'

interface OverlayUserPageProps {
	maintenanceBlank: boolean
}

const OverlayUserPage = ({ maintenanceBlank }: OverlayUserPageProps) => {
	if (maintenanceBlank) {
		return null
	}

	return <MainOverlay />
}

export default OverlayUserPage

export const getServerSideProps: GetServerSideProps<OverlayUserPageProps> = async () =>
	getOverlayMaintenanceProps({})
