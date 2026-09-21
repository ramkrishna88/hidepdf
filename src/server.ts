import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import fs from 'node:fs';
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

await fastify.register(cors, {
  origin: true,
  exposedHeaders: [
    'x-hidepdf-hidden',
    'x-hidepdf-mode',
    'x-hidepdf-text-removed',
    'x-hidepdf-extractable'
  ]
});
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
fastify.addHook('onSend', async (request, reply) => {
  const proto = String(request.headers['x-forwarded-proto'] || request.protocol || '');
  if (proto.split(',')[0].trim() === 'https') {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
});

fastify.get('/ads.txt', async (_request, reply) => {
  const body = fs.readFileSync(path.join(__dirname, 'public', 'ads.txt'), 'utf8');
  return reply
    .header('Content-Type', 'text/plain')
    .header('Cache-Control', 'public, max-age=0, must-revalidate')
    .send(body);
});

fastify.get('/.well-known/security.txt', async (_request, reply) => {
  const body = fs.readFileSync(path.join(__dirname, 'public', '.well-known', 'security.txt'), 'utf8');
  return reply
    .type('text/plain; charset=utf-8')
    .header('Cache-Control', 'public, max-age=86400')
    .send(body);
});

await fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  dotfiles: 'allow',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return;
    }
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', 'inline; filename="hidepdf-sample.pdf"');
      return;
    }
    if (filePath.endsWith('.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return;
    }
    if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
      res.setHeader('Cache-Control', 'public, max-age=86400');
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
      message: 'Send a PDF as multipart/form-data field "file", or JSON {"file":"https://example.com/file.pdf"}.'
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

const sitePages = ['about', 'privacy', 'contact', 'terms'] as const;
for (const page of sitePages) {
  fastify.get(`/${page}`, async (_request, reply) => reply.sendFile(`${page}.html`));
}

await healthRoutes(fastify);
await exampleRoutes(fastify);
await inspectRoutes(fastify);
await redactRoutes(fastify);

fastify.get('/v1/hide-types', async () => ({
  status: 'ok',
  default_if_empty: 'If the user does not pick fields or types, every detected sensitive type is hidden except amounts. Send hide_amounts=true or types=amount to hide money values.',
  ...hideTypesCatalog()
}));

fastify.get('/openapi.json', async () => ({
  openapi: '3.0.3',
  info: {
    title: 'HidePDF Content — Hide sensitive data in PDFs',
    description: 'Upload a PDF, review emails, phones, cards, country IDs (Aadhaar, PAN, UPI, SSN, and more), and optional amounts, then download a burned file with hidden text removed so it cannot be extracted. Amounts stay visible unless hide_amounts is set. Scanned pages use OCR. Playground is same-origin and does not need an API key.',
    version: '1.0.0',
    contact: {
      name: 'HidePDF Content',
      url: PUBLIC_BASE_URL,
      email: 'hello@hidepdfcontent.com'
    },
    'x-category': 'Data',
    'x-website': 'https://hidepdfcontent.com'
  },
  servers: [{ url: PUBLIC_BASE_URL, description: 'Production' }],
  paths: {
    '/v1/health': {
      get: {
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'Service is healthy' } }
      }
    },
    '/v1/example': {
      get: {
        summary: 'Example hide inspect response',
        description: 'No file required. Returns a small inspect JSON sample so RapidAPI Hub testers can click Run without uploading a PDF.',
        security: [],
        responses: { '200': { description: 'Sample inspect JSON' } }
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
        security: [],
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
        summary: 'Hide selected or all detected fields and remove the text',
        security: [],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  types: { type: 'string', description: 'Comma-separated hide types. Include amount to hide money values.' },
                  countries: { type: 'string', description: 'Comma-separated country codes such as IN,US' },
                  item_ids: { type: 'string', description: 'Comma-separated item IDs from inspect' },
                  hide_amounts: { type: 'boolean', description: 'Set true to also hide amounts. Amounts stay visible by default.' }
                }
              }
            }
          }
        },
        responses: { '200': { description: 'PDF with hidden text removed' } }
      }
    }
  },
  components: {
    securitySchemes: {}
  },
  security: []
}));

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
} catch (error) {
  fastify.log.error(error);
  process.exit(1);
}
