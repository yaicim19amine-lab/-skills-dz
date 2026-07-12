import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseForUser } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIDEO_CATEGORIES = new Set(['introduction', 'debutant', 'intermediaire', 'avance', 'pro']);

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);

  try {
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = getSupabaseForUser(token);

    if (req.method === 'GET') {
      const { category } = req.query;
      let query = supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (category) {
        if (!VIDEO_CATEGORIES.has(category)) return jsonError(res, 400, 'Catégorie invalide');
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) return jsonError(res, 500, error.message);
      return jsonResponse(res, 200, { videos: data });
    }

    if (req.method === 'POST') {
      if (!user) return jsonError(res, 401, 'Non autorisé');
      const { videoId } = req.body;
      if (!videoId) return jsonError(res, 400, 'ID vidéo requis');
      if (!UUID_RE.test(videoId)) return jsonError(res, 400, 'ID vidéo invalide');

      const { data: video } = await supabase.from('videos').select('id, xp_reward').eq('id', videoId).maybeSingle();
      if (!video) return jsonError(res, 404, 'Vidéo non trouvée');

      const { data: existing } = await supabase.from('user_videos').select('id').eq('user_id', user.userId).eq('video_id', videoId).maybeSingle();
      if (existing) return jsonResponse(res, 200, { success: true, message: 'Déjà comptabilisé' });

      const xp = video?.xp_reward || 30;
      const { error: insertError } = await supabase.from('user_videos').insert({ user_id: user.userId, video_id: videoId });
      if (insertError) return jsonError(res, 409, 'Vidéo déjà comptabilisée ou invalide');

      const { data: xpData, error: xpError } = await supabase.rpc('award_xp', { p_user_id: user.userId, p_amount: xp, p_reason: 'Vidéo regardée', p_source: 'video' });
      if (xpError) return jsonError(res, 500, xpError.message);

      const xpResult = Array.isArray(xpData) ? xpData[0] : xpData;
      return jsonResponse(res, 200, { success: true, xp, currentXp: xpResult?.xp, level: xpResult?.level });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
