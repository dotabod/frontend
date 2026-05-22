import type { Prisma } from '@prisma/client'
import type Stripe from 'stripe'
import { CustomerService } from '../services/customer-service'
import { debugLog } from '../utils/debugLog'

/**
 * Handles a customer deleted event from Stripe
 * @param customer The Stripe customer object
 * @param tx The transaction client
 * @returns True if the operation was successful, false otherwise
 */
export async function handleCustomerDeleted(
  customer: Stripe.Customer,
  tx: Prisma.TransactionClient,
): Promise<boolean> {
  debugLog('Entering handleCustomerDeleted', { customerId: customer.id })
  const customerService = new CustomerService(tx)
  debugLog('Instantiated CustomerService')
  const result = await customerService.handleCustomerDeleted(customer)
  debugLog('Finished customerService.handleCustomerDeleted', { result })
  debugLog('Exiting handleCustomerDeleted', { customerId: customer.id, result })
  return result
}
