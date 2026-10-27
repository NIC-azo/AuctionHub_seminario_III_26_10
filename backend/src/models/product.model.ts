import { Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const productWithSellerSelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  imageUrl: true,
  status: true,
  sellerId: true,
  createdAt: true,
  seller: {
    select: {
      id: true,
      username: true,
    },
  },
} satisfies Prisma.ProductSelect;

export function findAvailableProducts() {
  return prisma.product.findMany({
    where: { status: ProductStatus.AVAILABLE },
    select: productWithSellerSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export function createProduct(data: {
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  sellerId: string;
}) {
  return prisma.product.create({
    data,
    select: productWithSellerSelect,
  });
}

export function findProductForPurchase(
  transaction: Prisma.TransactionClient,
  id: string,
) {
  return transaction.product.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      sellerId: true,
    },
  });
}

export function markProductSold(
  transaction: Prisma.TransactionClient,
  id: string,
) {
  return transaction.product.updateMany({
    where: {
      id,
      status: ProductStatus.AVAILABLE,
    },
    data: { status: ProductStatus.SOLD },
  });
}
