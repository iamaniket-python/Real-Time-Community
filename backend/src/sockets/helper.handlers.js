import { z } from 'zod';
import { query } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { haversineKm, roundCoord } from '../utils/geo.js';
import { emitToUser } from './io.js';
import { activeJob } from './presence.js';

const locationSchema = z
  .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
  .strict();

const MIN_INTERVAL_MS = 2_000;   // max one accepted update per 2 s per socket
const DB_WRITE_INTERVAL_MS = 10_000;

export function registerHelperHandlers(socket) {
  const { user } = socket.data;
  if (!user.helperId) return;

  let lastUpdate = 0;
  let lastWrite = 0;

  socket.on('helper:location_update', async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try {
      const now = Date.now();
      if (now - lastUpdate < MIN_INTERVAL_MS) return reply({ ok: false, errorCode: 'RATE_LIMITED' });
      lastUpdate = now; // set before any await so parallel calls can't slip through

      const parsed = locationSchema.safeParse(payload);
      if (!parsed.success) return reply({ ok: false, errorCode: 'VALIDATION_ERROR' });
      const { lat, lng } = parsed.data;

      // The database is written far less often than the live feed
      if (now - lastWrite >= DB_WRITE_INTERVAL_MS) {
        lastWrite = now;
        await query(
          `UPDATE helper_profiles
              SET current_lat = $2, current_lng = $3, location_updated_at = now()
            WHERE id = $1`, [user.helperId, lat, lng]);
      }

      // Live tracking only while a job is active, and only to that job's requester
      const job = await activeJob(user.helperId);
      if (job) {
        emitToUser(job.user_id, 'helper:location_update', {
          requestId: job.id,
          lat: roundCoord(lat, 4),
          lng: roundCoord(lng, 4),
          distanceKm: Math.round(haversineKm(lat, lng, job.lat, job.lng) * 10) / 10,
          at: new Date().toISOString(),
        });
      }
      reply({ ok: true, tracking: Boolean(job) });
    } catch (err) {
      logger.error({ err }, 'helper:location_update failed');
      reply({ ok: false, errorCode: 'INTERNAL_ERROR' });
    }
  });
}