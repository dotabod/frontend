import { useTrack } from '@/lib/track'
import { Modal } from 'antd'
import { App } from 'antd'
import { useEffect, useState } from 'react'

const KofiButton = () => {
  const track = useTrack()
  const { notification } = App.useApp()
  const [isKofiModalOpen, setIsKofiModalOpen] = useState(false)

  useEffect(() => {
    notification.open({
      key: 'donate',
      duration: 0,
      placement: 'bottomLeft',
      message: 'Support Dotabod Development',
      description:
        'Help keep Dotabod free and get new features faster by supporting the project with a donation.',
      btn: (
        <button
          type="button"
          onClick={() => {
            track('kofi_donate_button_clicked')
            setIsKofiModalOpen(true)
            notification.destroy('donate')
          }}
        >
          <img
            height="36"
            style={{ border: '0px', height: '36px' }}
            src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
            alt="Support me at ko-fi.com"
          />
        </button>
      ),
    })
  }, [notification, track])

  return (
    <Modal
      title="Support Dotabod"
      open={isKofiModalOpen}
      onCancel={() => setIsKofiModalOpen(false)}
      footer={null}
    >
      <iframe
        id="kofiframe"
        src="https://ko-fi.com/dotabod/?hidefeed=true&widget=true&embed=true&preview=true"
        style={{
          border: 'none',
          width: '100%',
          padding: '4px',
          background: '#f9f9f9',
        }}
        height="712"
        title="dotabod"
      />
    </Modal>
  )
}

export default KofiButton
