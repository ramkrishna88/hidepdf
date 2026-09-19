import { FastifyInstance } from 'fastify';
import { EXAMPLE_INSPECT_RESPONSE } from '../lib/hubResponse.js';

export async function exampleRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/example', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return EXAMPLE_INSPECT_RESPONSE;
  });
}
