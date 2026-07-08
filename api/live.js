import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data: sessions, error } = await supabase
        .from('live_sessions')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const upcoming = (sessions || []).filter(s => s.status === 'scheduled');
      const nextLive = upcoming.length > 0 ? upcoming[0] : null;

      return jsonResponse(res, 200, {
        schedule: (sessions || []).map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          date: s.scheduled_at,
          youtubeUrl: s.youtube_url,
          status: s.status,
        })),
        nextLive: nextLive ? { title: nextLive.title, date: nextLive.scheduled_at, youtubeUrl: nextLive.youtube_url } : null,
      });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
