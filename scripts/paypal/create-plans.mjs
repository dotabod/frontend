// One-off setup: creates the "Dotabod Pro" product and the monthly/annual
// Billing plans in PayPal. Run once per environment with the matching Doppler
// Config so credentials and base URL line up:
//
//   Doppler run --config dev -- node scripts/paypal/create-plans.mjs sandbox
//   Doppler run --config prd -- node scripts/paypal/create-plans.mjs live
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
  { interval: 'MONTH', key: 'MONTHLY', name: 'Dotabod Pro (Monthly)', value: '6' },
  { interval: 'YEAR', key: 'ANNUAL', name: 'Dotabod Pro (Annual)', value: '57' },
]

async function token() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`token failed: ${res.status} ${JSON.stringify(data)}`)
  }
  return data.access_token
}

async function api(accessToken, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `dotabod-${env}-${path}-${body.name ?? body.product_id ?? Date.now()}`,
    },
    method: 'POST',
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${JSON.stringify(data)}`)
  }
  return data
}

async function main() {
  console.log(`\n=== Creating PayPal plans in ${env.toUpperCase()} (${BASE}) ===\n`)
  const accessToken = await token()

  const product = await api(accessToken, '/v1/catalogs/products', {
    category: 'SOFTWARE',
    description: 'Dotabod Pro subscription',
    name: 'Dotabod Pro',
    type: 'SERVICE',
  })
  console.log(`Product: ${product.id}`)

  const results = {}
  for (const plan of PLANS) {
    const created = await api(accessToken, '/v1/billing/plans', {
      billing_cycles: [
        {
          frequency: { interval_count: 1, interval_unit: plan.interval },
          pricing_scheme: { fixed_price: { currency_code: 'USD', value: plan.value } },
          sequence: 1,
          tenure_type: 'REGULAR',
          total_cycles: 0,
        },
      ],
      name: plan.name,
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
        setup_fee: { currency_code: 'USD', value: '0' },
        setup_fee_failure_action: 'CONTINUE',
      },
      product_id: product.id,
      status: 'ACTIVE',
    })
    results[plan.key] = created.id
    console.log(`${plan.name}: ${created.id}`)
  }

  console.log('\nSet these in the matching Doppler config:')
  console.log(`  PAYPAL_PLAN_ID_MONTHLY=${results.MONTHLY}`)
  console.log(`  PAYPAL_PLAN_ID_ANNUAL=${results.ANNUAL}`)
}

main().catch((error) => {
  console.error('\nFailed:', error.message)
  process.exit(1)
})
