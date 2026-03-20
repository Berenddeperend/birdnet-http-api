import {
  todaySpecies,
  speciesInRange,
  dailyCounts,
  hourlyActivity,
  recentDetections,
  weeklyReport,
} from './db.js';

export function registerRoutes(app) {
  app.addHook('onRequest', (req, reply, done) => {
    const origin = process.env.CORS_ORIGIN || '*';
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Methods', 'GET');
    done();
  });

  app.get('/api/today', () => todaySpecies());

  app.get('/api/recent', (req) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    return recentDetections(limit);
  });

  app.get('/api/species', (req) => {
    const { from, to } = req.query;
    if (!from || !to) return { error: 'from and to query params required' };
    return speciesInRange(from, to);
  });

  app.get('/api/daily', (req) => {
    const { from, to } = req.query;
    if (!from || !to) return { error: 'from and to query params required' };
    return dailyCounts(from, to);
  });

  app.get('/api/hourly', (req) => {
    const { from, to } = req.query;
    if (!from || !to) return { error: 'from and to query params required' };
    return hourlyActivity(from, to);
  });

  app.get('/api/report', () => weeklyReport());

  app.get('/live', (req) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    return recentDetections(limit);
  });

  app.get('/health', () => ({ status: 'ok' }));
}
