import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { readPdfUpload, readSelection, requireApiKey } from '../lib/request.js';
import { redactPdf } from '../services/redactor.js';

export async function redactRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/redact', { preHandler: requireApiKey }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const buffer = await readPdfUpload(request);
      const { itemIds, types } = readSelection(request);
      const result = await redactPdf(buffer, { itemIds, types });
      reply.header('x-hidepdf-hidden', String(result.hidden));
      reply.header('x-hidepdf-mode', result.mode);
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
