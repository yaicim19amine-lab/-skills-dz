import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { category } = req.query;
      let query = supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) return jsonError(res, 500, error.message);
      return jsonResponse(res, 200, { videos: data });
    }

    if (req.method === 'POST') {
      if (!user) return jsonError(res, 401, 'Non autorisé');
      const { videoId } = req.body;
      if (!videoId) return jsonError(res, 400, 'ID vidéo requis');

      const { data: existing } = await supabase.from('user_videos').select('id').eq('user_id', user.userId).eq('video_id', videoId).single();
      if (existing) return jsonResponse(res, 200, { success: true, message: 'Déjà comptabilisé' });

      await supabase.from('user_videos').insert({ user_id: user.userId, video_id: videoId });

      const { data: video } = await supabase.from('videos').select('xp_reward').eq('id', videoId).single();
      const xp = video?.xp_reward || 30;

      await supabase.rpc('increment_xp', { user_id: user.userId, amount: xp });
      await supabase.from('xp_transactions').insert({ user_id: user.userId, amount: xp, reason: 'Vidéo regardée', source: 'video' });

      return jsonResponse(res, 200, { success: true, xp });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
