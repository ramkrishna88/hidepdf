import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectRoutes } from './routes/inspect.js';
import { redactRoutes } from './routes/redact.js';
import { healthRoutes } from './routes/health.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_MB || 25) * 1024 * 1024;

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });
await fastify.register(rateLimit, { max: 40, timeWindow: '1 minute' });
await fastify.register(multipart, {
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  attachFieldsToBody: true
});
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/'
});

await healthRoutes(fastify);
await inspectRoutes(fastify);
await redactRoutes(fastify);

fastify.get('/v1/hide-types', async () => ({
  status: 'ok',
  default_if_empty: 'If the user does not pick fields or types, every detected sensitive type is hidden.',
  types: [
    { id: 'email', label: 'Email addresses' },
    { id: 'phone', label: 'Phone numbers' },
    { id: 'credit_card', label: 'Credit cards' },
    { id: 'ssn', label: 'National IDs / SSNs' },
    { id: 'iban', label: 'Bank accounts (IBAN)' }
  ]
}));

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
