import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireApiAuth } from '../lib/apiAuth.js';
import { readPdfUpload } from '../lib/request.js';
import { inspectPdf } from '../services/redactor.js';

export async function inspectRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/inspect', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute'
      }
    },
    preHandler: requireApiAuth
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const buffer = await readPdfUpload(request);
      const result = await inspectPdf(buffer);
      return {
        status: 'ok',
        message: result.items_found
          ? `Found ${result.items_found} sensitive field${result.items_found === 1 ? '' : 's'}.`
          : 'No sensitive fields found. You can still run hide with the default types.',
        ...result
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function sendError(reply: FastifyReply, error: unknown) {
  const err = error as { statusCode?: number; errorCode?: string; message?: string };
  return reply.status(err.statusCode ?? 500).send({
    status: 'error',
    error_code: err.errorCode ?? 'INSPECT_FAILED',
    message: err.message ?? 'Could not inspect this PDF.'
  });
}
