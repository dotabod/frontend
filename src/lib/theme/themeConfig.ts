import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

// Create a stable theme configuration that won't change between renders
const themeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  // Set hash to false to avoid hash-based class names which can cause issues in SSR
  hashed: false,
  components: {
    Button: {
      colorLink: 'var(--color-purple-300)',
      colorPrimaryHover: 'var(--color-purple-300)',
    },
    Menu: {
      itemColor: 'var(--color-gray-300)',
      itemHoverBg: 'var(--color-gray-700)',
      itemSelectedBg: 'var(--color-gray-600)',
      itemSelectedColor: 'var(--color-gray-200)',
      subMenuItemBg: 'var(--color-gray-800)',
      subMenuItemSelectedColor: 'var(--color-gray-300)',
    },
    Slider: {
      dotBorderColor: 'rgb(107, 33, 168)',
      handleActiveColor: 'white',
      handleColor: 'white',
      railBg: 'rgba(255, 255, 255, 0.25)',
      railHoverBg: 'rgba(255, 255, 255, 0.35)',
      trackBg: 'rgb(107, 33, 168)',
      trackHoverBg: 'rgb(126, 34, 206)',
    },
    Spin: {
      colorPrimary: 'var(--color-purple-300)',
    },
    Steps: {
      colorPrimary: 'var(--color-purple-500)',
      colorPrimaryActive: 'var(--color-purple-300)',
      colorPrimaryHover: 'var(--color-purple-300)',
    },
    Switch: {
      colorPrimary: 'var(--color-purple-900)',
    },
    Tabs: {
      colorPrimary: 'var(--color-purple-400)',
      itemHoverColor: 'var(--color-purple-300)',
    },
  },
  token: {
    colorBgContainer: 'var(--color-gray-800)',
    colorBgLayout: 'var(--color-gray-900)',
    colorLink: 'var(--color-purple-500)',
    colorLinkActive: 'var(--color-purple-300)',
    colorLinkHover: 'var(--color-purple-300)',
    colorPrimary: 'rgb(85, 24, 103)',
    colorText: 'var(--color-gray-200)',
  },
}

export default themeConfig
