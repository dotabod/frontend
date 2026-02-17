import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stripe } from '@/lib/stripe-server'
import { CustomerService } from '@/pages/api/stripe/services/customer-service'

vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    customers: {
      retrieve: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('CustomerService.ensureCustomer', () => {
  const mockTx = {
    subscription: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a Stripe customer when user email is missing', async () => {
    mockTx.subscription.findFirst.mockResolvedValue(null)
    mockTx.subscription.updateMany.mockResolvedValue({ count: 0 })

    vi.mocked(stripe.customers.create).mockResolvedValue({
      id: 'cus_no_email',
    } as any)

    const service = new CustomerService(mockTx as any)

    const customerId = await service.ensureCustomer({
      id: 'user-1',
      email: null,
      name: 'No Email User',
    })

    expect(customerId).toBe('cus_no_email')
    expect(stripe.customers.list).not.toHaveBeenCalled()
    expect(stripe.customers.create).toHaveBeenCalledWith({
      email: undefined,
      metadata: {
        userId: 'user-1',
        email: '',
        name: 'No Email User',
        image: '',
        locale: '',
      },
    })
  })
})
