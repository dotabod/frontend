import type { Prisma } from '@prisma/client'
import { CustomerService } from '../services/customer-service'
import type Stripe from 'stripe'

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
  const customerService = new CustomerService(tx)
  return await customerService.handleCustomerDeleted(customer)
}
