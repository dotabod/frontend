// @ts-nocheck
import type { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { CustomerService } from '@/lib/stripe/services/customer-service'
import { stripe } from '@/lib/stripe-server'

vi.mock('@/lib/stripe-server', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
      list: vi.fn(),
      retrieve: vi.fn(),
    },
  },
}))

describe('CustomerService.ensureCustomer', () => {
  const mockTx: Pick<Prisma.TransactionClient, 'subscription'> = {
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
    } as Stripe.Customer)

    const service = new CustomerService(mockTx)

    const customerId = await service.ensureCustomer({
      email: null,
      id: 'user-1',
      name: 'No Email User',
    })

    expect(customerId).toBe('cus_no_email')
    expect(stripe.customers.list).not.toHaveBeenCalled()
    expect(stripe.customers.create).toHaveBeenCalledWith({
      email: undefined,
      metadata: {
        email: '',
        image: '',
        locale: '',
        name: 'No Email User',
        userId: 'user-1',
      },
    })
  })
})
