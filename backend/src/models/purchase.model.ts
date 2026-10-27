import { Prisma } from '@prisma/client';

export function createPurchase(
  transaction: Prisma.TransactionClient,
  data: { productId: string; buyerId: string },
) {
  return transaction.purchase.create({
    data,
    select: {
      id: true,
      productId: true,
      buyerId: true,
      createdAt: true,
    },
  });
}
