import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

const themeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  components: {
    Spin: {
      colorPrimary: 'var(--color-purple-300)',
    },
    Button: {
      colorLink: 'var(--color-purple-300)',
      colorPrimaryHover: 'var(--color-purple-300)',
    },
    Tabs: {
      colorPrimary: 'var(--color-purple-400)',
      itemHoverColor: 'var(--color-purple-300)',
    },
    Menu: {
      subMenuItemBg: 'var(--color-gray-800)',
      itemHoverBg: 'var(--color-gray-700)',
      itemSelectedBg: 'var(--color-gray-600)',
      itemSelectedColor: 'var(--color-gray-200)',
      itemColor: 'var(--color-gray-300)',
    },
    Switch: {
      colorPrimary: 'var(--color-purple-900)',
    },
    Steps: {
      colorPrimary: 'var(--color-purple-500)',
      colorPrimaryHover: 'var(--color-purple-300)',
      colorPrimaryActive: 'var(--color-purple-300)',
    },
  },
  token: {
    colorPrimary: 'rgb(85, 24, 103)',
    colorLink: 'var(--color-purple-500)',
    colorLinkActive: 'var(--color-purple-300)',
    colorLinkHover: 'var(--color-purple-300)',
    colorText: 'var(--color-gray-200)',
    colorBgLayout: 'var(--color-gray-900)',
    colorBgContainer: 'var(--color-gray-800)',
  },
}

export default themeConfig
