interface HubSpotConversationsWidget {
  load: (options?: { widgetOpen?: boolean }) => void
  refresh: (options?: { openToNewThread?: boolean }) => void
  remove: () => void
  open: () => void
  close: () => void
}

interface HubSpotConversations {
  widget: HubSpotConversationsWidget
  clear: (options?: { resetWidget?: boolean }) => void
}

interface HubSpotConversationsSettings {
  loadImmediately?: boolean
  identificationEmail?: string
  identificationToken?: string
}

interface Window {
  _hsq: unknown[]
  hsConversationsOnReady?: Array<() => void>
  hsConversationsSettings?: HubSpotConversationsSettings
  HubSpotConversations?: HubSpotConversations
}
