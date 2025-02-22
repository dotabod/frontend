import { Container } from '@/components/Container'
import { useSubscription } from '@/hooks/useSubscription'
import { SUBSCRIPTION_TIERS } from '@/utils/subscription'
import { CheckOutlined, CloseOutlined, InfoCircleOutlined, StarOutlined } from '@ant-design/icons'
import { Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import Image from 'next/image'
import { BillingPlans } from './Billing/BillingPlans'

const featureCategories = [
  {
    name: 'Setup & Configuration',
    features: [
      {
        name: 'Automated Setup',
        tooltip: 'Automatic configuration of various integrations',
        free: {
          value: 'Manual only',
          tooltip: 'Step-by-step setup guide provided',
        },
        starter: {
          value: 'Moderator setup (1)',
          tooltip: 'Automated Twitch moderator setup and basic configurations',
        },
        pro: {
          value: 'Full automation (4)',
          tooltip: 'Complete automated setup of Twitch, OBS, 7TV, and Dota 2 integration',
        },
      },
      {
        name: '7TV Integration',
        tooltip: 'Automatic emote setup with 7TV',
        free: <CloseOutlined className='text-red-500' />,
        starter: <CloseOutlined className='text-red-500' />,
        pro: <CheckOutlined className='text-green-500' />,
      },
      {
        name: 'OBS Integration',
        tooltip: 'Automatic OBS scene setup and configuration',
        free: <CloseOutlined className='text-red-500' />,
        starter: <CloseOutlined className='text-red-500' />,
        pro: <CheckOutlined className='text-green-500' />,
      },
    ],
  },
  {
    name: 'Stream Protection',
    features: [
      {
        name: 'Minimap Blocker',
        tooltip: 'Prevents stream sniping via minimap',
        free: {
          value: 'Basic',
          tooltip: 'Simple semi-transparent overlay',
        },
        starter: {
          value: 'Enhanced',
          tooltip: 'Customizable opacity and background options',
        },
        pro: {
          value: 'Advanced + Custom',
          tooltip:
            'Full customization with multiple styles, positions, and automatic game state detection',
        },
      },
      {
        name: 'Pick Blocker',
        tooltip: 'Hides hero picks during draft phase',
        free: <CloseOutlined className='text-red-500' />,
        starter: {
          value: 'Basic',
          tooltip: 'Simple pick phase blocking',
        },
        pro: {
          value: 'Full phase control',
          tooltip: 'Automatic phase detection with customizable overlays for each draft stage',
        },
      },
      {
        name: 'Stream Delay',
        tooltip: 'Customizable stream delay integration',
        free: <CloseOutlined className='text-red-500' />,
        starter: <CloseOutlined className='text-red-500' />,
        pro: 'Up to 30s',
      },
    ],
  },
  {
    name: 'Twitch Integration',
    features: [
      {
        name: 'Predictions',
        tooltip: 'Automated Twitch channel point predictions',
        free: <CloseOutlined className='text-red-500' />,
        starter: 'Basic',
        pro: 'Advanced + Overlay',
      },
      {
        name: 'Chat Features',
        tooltip: 'Interactive chat messages and events',
        free: {
          value: 'Basic',
          tooltip: 'Essential chat commands and match results',
        },
        starter: {
          value: 'Enhanced',
          tooltip: 'Additional interactions: Bets, midas timing, first blood, aegis events',
        },
        pro: {
          value: 'Full features',
          tooltip: 'Complete chat integration with all game events, items, and hero interactions',
        },
      },
      {
        name: 'MMR Tracking',
        tooltip: 'Track and display MMR changes',
        free: {
          value: 'Basic command',
          tooltip: 'Simple !mmr command to check current MMR',
        },
        starter: <CheckOutlined className='text-green-500' />,
        pro: {
          value: 'Advanced + Overlay',
          tooltip: 'Live MMR tracking with customizable overlay and historical data',
        },
      },
    ],
  },
  {
    name: 'Additional Benefits',
    features: [
      {
        name: 'Beta Features Access',
        tooltip: 'Get early access to new features and updates before they go live',
        free: <CloseOutlined className='text-red-500' />,
        starter: <CloseOutlined className='text-red-500' />,
        pro: (
          <span className='flex justify-center items-center gap-1'>
            <StarOutlined className='text-yellow-500' /> Priority access
          </span>
        ),
      },
      {
        name: 'Feature Updates',
        tooltip: 'Automatic access to new features as they are released',
        free: 'Basic only',
        starter: 'Standard',
        pro: (
          <span className='flex justify-center items-center gap-1'>
            <StarOutlined className='text-yellow-500' /> All features
          </span>
        ),
      },
    ],
  },
]

function FeatureComparison() {
  interface FeatureValue {
    value: string
    tooltip: string
  }

  interface Feature {
    name: string
    tooltip: string
    free: React.ReactNode | FeatureValue
    starter: React.ReactNode | FeatureValue
    pro: React.ReactNode | FeatureValue
  }

  interface TableItem extends Feature {
    key: string
    category: string
  }

  const flattenedData: TableItem[] = featureCategories.flatMap((category) =>
    category.features.map((feature) => ({
      key: `${category.name}-${feature.name}`,
      category: category.name,
      ...feature,
    })),
  )

  const columns: ColumnsType<TableItem> = [
    {
      title: 'Feature',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TableItem) => (
        <div className='flex items-center'>
          {text}
          <Tooltip title={record.tooltip}>
            <InfoCircleOutlined className='ml-2 text-gray-500 hover:text-gray-300' />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Free',
      dataIndex: SUBSCRIPTION_TIERS.FREE,
      key: SUBSCRIPTION_TIERS.FREE,
      align: 'center',
      render: (value: React.ReactNode | FeatureValue | null) =>
        value && typeof value === 'object' && 'value' in value ? (
          <Tooltip title={value.tooltip}>
            <span className='cursor-help'>{value.value}</span>
          </Tooltip>
        ) : (
          value
        ),
    },
    {
      title: 'Starter',
      dataIndex: SUBSCRIPTION_TIERS.STARTER,
      key: SUBSCRIPTION_TIERS.STARTER,
      align: 'center',
      render: (value: React.ReactNode | FeatureValue | null) =>
        value && typeof value === 'object' && 'value' in value ? (
          <Tooltip title={value.tooltip}>
            <span className='cursor-help'>{value.value}</span>
          </Tooltip>
        ) : (
          value
        ),
    },
    {
      title: 'Pro',
      dataIndex: SUBSCRIPTION_TIERS.PRO,
      key: SUBSCRIPTION_TIERS.PRO,
      align: 'center',
      render: (value: React.ReactNode | FeatureValue | null) =>
        value && typeof value === 'object' && 'value' in value ? (
          <Tooltip title={value.tooltip}>
            <span className='cursor-help'>{value.value}</span>
          </Tooltip>
        ) : (
          value
        ),
    },
  ]

  const demoImages = {
    'Minimap Blocker': {
      image: '/images/overlay/minimap/738-Complex-Large-AntiStreamSnipeMap.png',
      width: 240,
      height: 240,
      caption: 'Minimap blocker overlay example',
    },
    'Pick Blocker': {
      image: '/images/overlay/picks/block-radiant-picks.png',
      width: 600,
      height: 600,
      caption: 'Pick blocker during draft phase',
    },
    'Twitch Predictions': {
      image: 'https://i.imgur.com/8ZsUxJR.png',
      width: 425,
      height: 168,
      caption: 'Twitch predictions integration',
    },
    'Roshan Timer': {
      image: '/images/dashboard/rosh-timer.png',
      width: 336,
      height: 249,
      caption: 'Roshan timer overlay',
    },
  }

  return (
    <div className='mt-16'>
      <div className='px-6 py-4 bg-gray-900/50 rounded-t-lg'>
        <h3 className='text-xl font-semibold text-gray-100'>Feature Comparison</h3>
      </div>
      <Table
        columns={columns}
        dataSource={flattenedData}
        pagination={false}
        className='pricing-table'
        rowClassName={(record) => `pricing-table-row category-${record.category}`}
        size='middle'
        bordered
        expandable={{
          expandedRowRender: (record) => (
            <div className='px-4 py-6 space-y-4'>
              <p className='text-gray-400'>{record.tooltip}</p>
              {demoImages[record.name] && (
                <div className='flex flex-col items-center space-y-2'>
                  <Image
                    src={demoImages[record.name].image}
                    width={demoImages[record.name].width}
                    height={demoImages[record.name].height}
                    alt={record.name}
                    className='rounded-lg'
                  />
                  <span className='text-sm text-gray-500'>{demoImages[record.name].caption}</span>
                </div>
              )}
            </div>
          ),
          rowExpandable: (record) => true,
        }}
        showHeader={true}
        rowKey='key'
      />
    </div>
  )
}

export function Pricing() {
  const { subscription } = useSubscription()

  return (
    <section
      id='pricing'
      aria-labelledby='pricing-title'
      className='border-t border-gray-800 bg-gradient-to-b from-gray-900 to-black py-20 sm:py-32'
    >
      <Container>
        <BillingPlans subscription={subscription} />
      </Container>
    </section>
  )
}
