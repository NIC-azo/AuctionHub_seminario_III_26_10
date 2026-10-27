import { Prisma, ProductStatus } from '@prisma/client';
import {
  createProduct,
  findProductForPurchase,
  markProductSold,
} from '../models/product.model.js';
import { createPurchase } from '../models/purchase.model.js';
import { prisma } from '../config/prisma.js';
import { deleteProductImage, uploadProductImage } from './minio.service.js';
import { HttpError } from '../utils/http-error.js';

export async function publishProduct(input: {
  title: string;
  description: string;
  price: number;
  sellerId: string;
  image: Express.Multer.File;
}) {
  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 3 || title.length > 120) {
    throw new HttpError(400, 'INVALID_TITLE', 'Title must be 3 to 120 characters.');
  }
  if (description.length < 1 || description.length > 5000) {
    throw new HttpError(400, 'INVALID_DESCRIPTION', 'Description must be 1 to 5000 characters.');
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new HttpError(400, 'INVALID_PRICE', 'Price must be a positive number.');
  }

  const image = await uploadProductImage(input.image);

  try {
    return await createProduct({
      title,
      description,
      price: input.price,
      imageUrl: image.url,
      sellerId: input.sellerId,
    });
  } catch (error) {
    try {
      await deleteProductImage(image.key);
    } catch (cleanupError) {
      console.error('Failed to remove product image after product creation failed.', cleanupError);
    }
    throw error;
  }
}

export async function buyProduct(productId: string, buyerId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new HttpError(400, 'INVALID_PRODUCT_ID', 'Product ID must be a valid UUID.');
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const product = await findProductForPurchase(transaction, productId);

      if (!product) {
        throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
      }
      if (product.sellerId === buyerId) {
        throw new HttpError(403, 'SELF_PURCHASE', 'You cannot buy your own product.');
      }
      if (product.status !== ProductStatus.AVAILABLE) {
        throw new HttpError(409, 'PRODUCT_UNAVAILABLE', 'Product is no longer available.');
      }

      const updateResult = await markProductSold(transaction, productId);
      if (updateResult.count !== 1) {
        throw new HttpError(409, 'PRODUCT_UNAVAILABLE', 'Product is no longer available.');
      }

      return createPurchase(transaction, { productId, buyerId });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      throw new HttpError(409, 'PRODUCT_UNAVAILABLE', 'Product is no longer available.');
    }
    throw error;
  }
}
