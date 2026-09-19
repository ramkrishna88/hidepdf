import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/health', async () => ({
    status: 'ok',
    service: 'hidepdf',
    time: new Date().toISOString()
  }));
}
