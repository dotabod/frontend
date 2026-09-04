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
      colorPrimary: 'var(--color-purple-800)',
      colorPrimaryActive: 'var(--color-purple-900)',
      colorPrimaryHover: 'var(--color-purple-700)',
      primaryColor: 'var(--color-gray-200)',
    },
    Checkbox: {
      colorPrimary: 'var(--color-purple-500)',
      colorPrimaryActive: 'var(--color-purple-600)',
      colorPrimaryHover: 'var(--color-purple-500)',
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
      colorPrimary: 'var(--color-purple-500)',
      colorPrimaryHover: 'var(--color-purple-400)',
    },
    Tabs: {
      colorPrimary: 'var(--color-purple-400)',
      itemActiveColor: 'var(--color-purple-300)',
      itemHoverColor: 'var(--color-purple-300)',
      itemSelectedColor: 'var(--color-purple-300)',
    },
    Radio: {
      buttonCheckedBg: 'var(--color-gray-700)',
      buttonCheckedBgDisabled: 'var(--color-gray-900)',
      buttonCheckedColorDisabled: 'var(--color-gray-400)',
      buttonSolidCheckedActiveBg: 'var(--color-purple-900)',
      buttonSolidCheckedBg: 'var(--color-purple-800)',
      buttonSolidCheckedColor: 'var(--color-gray-200)',
      buttonSolidCheckedHoverBg: 'var(--color-purple-700)',
      colorPrimary: 'var(--color-purple-300)',
      colorPrimaryActive: 'var(--color-purple-400)',
      colorPrimaryHover: 'var(--color-purple-200)',
    },
    Segmented: {
      itemActiveBg: 'var(--color-gray-700)',
      itemColor: 'var(--color-gray-300)',
      itemHoverBg: 'var(--color-gray-700)',
      itemHoverColor: 'var(--color-gray-200)',
      itemSelectedBg: 'var(--color-gray-600)',
      itemSelectedColor: 'var(--color-gray-200)',
      trackBg: 'var(--color-gray-900)',
    },
  },
  token: {
    colorBgContainer: 'var(--color-gray-800)',
    colorBgContainerDisabled: 'var(--color-gray-900)',
    colorBgLayout: 'var(--color-gray-900)',
    colorLink: 'var(--color-purple-500)',
    colorLinkActive: 'var(--color-purple-300)',
    colorLinkHover: 'var(--color-purple-300)',
    colorPrimary: 'var(--color-purple-300)',
    colorPrimaryActive: 'var(--color-purple-400)',
    colorPrimaryHover: 'var(--color-purple-200)',
    colorText: 'var(--color-gray-200)',
    colorTextDisabled: 'var(--color-gray-400)',
    controlItemBgActive: 'var(--color-gray-700)',
    controlItemBgActiveDisabled: 'var(--color-gray-800)',
    controlItemBgActiveHover: 'var(--color-gray-600)',
  },
}

export default themeConfig
