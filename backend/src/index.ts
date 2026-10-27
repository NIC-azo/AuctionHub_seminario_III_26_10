import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { prisma } from './config/prisma.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { authRoutes } from './routes/auth.routes.js';
import { productRoutes } from './routes/product.routes.js';
import { HttpError } from './utils/http-error.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_request, response) => {
  response.status(200).json({ data: { status: 'ok' } });
});
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use((_request, _response, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', 'API route was not found.'));
});
app.use(errorHandler);

const server = app.listen(port, '0.0.0.0', () => {
  console.info(`AuctionHub API listening on port ${port}.`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.info(`Received ${signal}; shutting down API.`);
  server.close((error) => {
    if (error) {
      console.error('Failed to close the HTTP server cleanly.', error);
      process.exitCode = 1;
    }
    void prisma.$disconnect().catch((disconnectError: unknown) => {
      console.error('Failed to disconnect Prisma cleanly.', disconnectError);
      process.exitCode = 1;
    });
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);