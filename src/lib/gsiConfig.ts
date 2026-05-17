export const buildGsiConfig = (userId: string) => `"Dotabod Configuration"
{
  "uri" "${process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL}"
  "timeout" "5.0"
  "buffer" "0.5"
  "throttle" "0.5"
  "heartbeat" "30.0"
  "data"
  {
    "abilities" "1"
    "buildings" "1"
    "events" "1"
    "hero" "1"
    "items" "1"
    "map" "1"
    "player" "1"
    "provider" "1"
    "wearables" "1"
  }
  "auth"
  {
    "token" "${userId}"
  }
}
`
