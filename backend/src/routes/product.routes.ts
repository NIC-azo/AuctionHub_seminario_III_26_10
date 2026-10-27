import { Router } from 'express';
import {
  createProduct,
  listProducts,
  purchaseProduct,
} from '../controllers/product.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadProductImage } from '../middlewares/upload.middleware.js';

const productRoutes = Router();

productRoutes.get('/', listProducts);
productRoutes.post('/', requireAuth, uploadProductImage.single('image'), createProduct);
productRoutes.post('/:id/buy', requireAuth, purchaseProduct);

export { productRoutes };
