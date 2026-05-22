// One-off setup: creates the "Dotabod Pro" product and the monthly/annual
// billing plans in PayPal. Run once per environment with the matching Doppler
// config so credentials and base URL line up:
//
//   doppler run --config dev -- node scripts/paypal/create-plans.mjs sandbox
//   doppler run --config prd -- node scripts/paypal/create-plans.mjs live
//
// Then set PAYPAL_PLAN_ID_MONTHLY / PAYPAL_PLAN_ID_ANNUAL in the matching config.

const env = process.argv[2]
if (env !== 'sandbox' && env !== 'live') {
  console.error('Usage: node create-plans.mjs <sandbox|live>')
  process.exit(1)
}

const BASE = env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set in the environment')
  process.exit(1)
}

const PLANS = [
  { key: 'MONTHLY', name: 'Dotabod Pro (Monthly)', interval: 'MONTH', value: '6' },
  { key: 'ANNUAL', name: 'Dotabod Pro (Annual)', interval: 'YEAR', value: '57' },
]

async function token() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`token failed: ${res.status} ${JSON.stringify(data)}`)
  return data.access_token
}

async function api(accessToken, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `dotabod-${env}-${path}-${body.name ?? body.product_id ?? Date.now()}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(data)}`)
  return data
}

async function main() {
  console.log(`\n=== Creating PayPal plans in ${env.toUpperCase()} (${BASE}) ===\n`)
  const accessToken = await token()

  const product = await api(accessToken, '/v1/catalogs/products', {
    name: 'Dotabod Pro',
    description: 'Dotabod Pro subscription',
    type: 'SERVICE',
    category: 'SOFTWARE',
  })
  console.log(`Product: ${product.id}`)

  const results = {}
  for (const plan of PLANS) {
    const created = await api(accessToken, '/v1/billing/plans', {
      product_id: product.id,
      name: plan.name,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: { interval_unit: plan.interval, interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: plan.value, currency_code: 'USD' } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: '0', currency_code: 'USD' },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 2,
      },
    })
    results[plan.key] = created.id
    console.log(`${plan.name}: ${created.id}`)
  }

  console.log('\nSet these in the matching Doppler config:')
  console.log(`  PAYPAL_PLAN_ID_MONTHLY=${results.MONTHLY}`)
  console.log(`  PAYPAL_PLAN_ID_ANNUAL=${results.ANNUAL}`)
}

main().catch((err) => {
  console.error('\nFailed:', err.message)
  process.exit(1)
})
