import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireApiAuth } from '../lib/apiAuth.js';
import { readPdfUpload, readSelection } from '../lib/request.js';
import { redactPdf } from '../services/redactor.js';

export async function redactRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/redact', {
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
      const { itemIds, types, hideAmounts } = readSelection(request);
      const result = await redactPdf(buffer, { itemIds, types, hideAmounts });
      reply.header('x-hidepdf-hidden', String(result.hidden));
      reply.header('x-hidepdf-mode', result.mode);
      reply.header('x-hidepdf-text-removed', result.text_removed ? '1' : '0');
      reply.header('x-hidepdf-extractable', String(result.leftover_matches));
      return reply
        .type('application/pdf')
        .header('content-disposition', 'attachment; filename="hidden.pdf"')
        .send(Buffer.from(result.pdf));
    } catch (error) {
      return sendError(reply, error);
    }
  });
}

function sendError(reply: FastifyReply, error: unknown) {
  const err = error as { statusCode?: number; errorCode?: string; message?: string };
  return reply.status(err.statusCode ?? 500).send({
    status: 'error',
    error_code: err.errorCode ?? 'REDACT_FAILED',
    message: err.message ?? 'Could not hide data in this PDF.'
  });
}
