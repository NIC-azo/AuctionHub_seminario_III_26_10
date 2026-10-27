import type { RequestHandler } from 'express';
import { findAvailableProducts } from '../models/product.model.js';
import { buyProduct, publishProduct } from '../services/product.service.js';
import { HttpError } from '../utils/http-error.js';

function readString(body: unknown, key: string): string | undefined {
  if (typeof body !== 'object' || body === null || !(key in body)) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

export const listProducts: RequestHandler = async (_request, response) => {
  const products = await findAvailableProducts();
  response.status(200).json({ data: { products } });
};

export const createProduct: RequestHandler = async (request, response) => {
  const title = readString(request.body, 'title');
  const description = readString(request.body, 'description');
  const priceValue = readString(request.body, 'price');
  const price = priceValue === undefined ? Number.NaN : Number(priceValue);

  if (!title || !description || !request.file || !request.user) {
    throw new HttpError(
      400,
      'INVALID_REQUEST',
      'title, description, price, and an image file are required.',
    );
  }

  const product = await publishProduct({
    title,
    description,
    price,
    sellerId: request.user.id,
    image: request.file,
  });

  response.status(201).json({ data: { product } });
};

export const purchaseProduct: RequestHandler<{ id: string }> = async (request, response) => {
  if (!request.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const purchase = await buyProduct(request.params.id, request.user.id);
  response.status(201).json({ data: { purchase } });
};
