import MainOverlay from '@/components/Overlay'

const OverlayUserPage = () => {
  if (process.env.NEXT_PUBLIC_IS_IN_MAINTENANCE_MODE === 'true') {
    return null
  }

  return <MainOverlay />
}

export default OverlayUserPage
