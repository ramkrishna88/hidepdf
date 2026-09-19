import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFileTooLargeError, isNotMultipartError } from './lib/errors.js';
import { hideTypesCatalog } from './lib/types.js';
import { inspectRoutes } from './routes/inspect.js';
import { redactRoutes } from './routes/redact.js';
import { healthRoutes } from './routes/health.js';
import { exampleRoutes } from './routes/example.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_MB || 25) * 1024 * 1024;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

const fastify = Fastify({
  logger: true,
  trustProxy: true,
  requestTimeout: 180_000
});

await fastify.register(cors, { origin: true });
await fastify.register(rateLimit, {
  global: false,
  errorResponseBuilder: (_request, context) => ({
    status: 'error',
    error_code: 'RATE_LIMITED',
    message: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
    retry_after_seconds: Math.ceil(context.ttl / 1000)
  })
});
await fastify.register(multipart, {
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  attachFieldsToBody: true
});
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return;
    }
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', 'inline; filename="hidepdf-sample.pdf"');
    }
  }
});

fastify.setErrorHandler((error, request, reply) => {
  if (isFileTooLargeError(error)) {
    return reply.status(413).send({
      status: 'error',
      error_code: 'FILE_TOO_LARGE',
      message: `The uploaded PDF exceeds the maximum API limit of ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.`,
      max_limit_mb: MAX_FILE_SIZE_BYTES / (1024 * 1024)
    });
  }

  if (isNotMultipartError(error)) {
    return reply.status(400).send({
      status: 'error',
      error_code: 'NOT_MULTIPART',
      message: 'This endpoint requires multipart/form-data with a PDF file field named "file".'
    });
  }

  request.log.error(error);
  const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 500
    ? error.statusCode
    : 500;
  return reply.status(statusCode).send({
    status: 'error',
    error_code: statusCode < 500 ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
    message: statusCode < 500 ? (error.message || 'Bad request') : 'An internal error occurred.'
  });
});

await healthRoutes(fastify);
await exampleRoutes(fastify);
await inspectRoutes(fastify);
await redactRoutes(fastify);

fastify.get('/v1/hide-types', async () => ({
  status: 'ok',
  default_if_empty: 'If the user does not pick fields or types, every detected sensitive type is hidden.',
  ...hideTypesCatalog()
}));

fastify.get('/openapi.json', async () => ({
  openapi: '3.0.3',
  info: {
    title: 'HidePDF — Hide sensitive data in PDFs',
    description: 'Upload a text-layer PDF, inspect emails, phones, cards, and country IDs (Aadhaar, PAN, UPI, SSN, and more), then download a visually redacted file. Playground is same-origin and does not need an API key.',
    version: '1.0.0',
    contact: {
      name: 'HidePDF',
      url: PUBLIC_BASE_URL
    }
  },
  servers: [{ url: PUBLIC_BASE_URL }],
  paths: {
    '/v1/health': {
      get: {
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'Service is healthy' } }
      }
    },
    '/v1/hide-types': {
      get: {
        summary: 'List hide types and countries',
        security: [],
        responses: { '200': { description: 'Global types plus country ID catalog' } }
      }
    },
    '/v1/inspect': {
      post: {
        summary: 'Find sensitive fields in a PDF',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } }
              }
            }
          }
        },
        responses: { '200': { description: 'Detected fields' } }
      }
    },
    '/v1/redact': {
      post: {
        summary: 'Hide selected or all detected fields',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  types: { type: 'string', description: 'Comma-separated hide types' },
                  countries: { type: 'string', description: 'Comma-separated country codes such as IN,US' },
                  item_ids: { type: 'string', description: 'Comma-separated item IDs from inspect' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'Redacted PDF' } }
      }
    }
  },
  components: {
    securitySchemes: {
      apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' }
    }
  },
  security: [{ apiKey: [] }]
}));

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
