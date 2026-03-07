import Fastify from 'fastify';
import { registerRoutes } from './api.js';

const PORT = parseInt(process.env.PORT || '3080');
const HOST = process.env.HOST || '0.0.0.0';

const app = Fastify({ logger: true });

registerRoutes(app);

app.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
