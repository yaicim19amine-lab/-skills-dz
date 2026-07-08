import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('formations').select('*').order('created_at', { ascending: false });
      if (error) return jsonError(res, 500, error.message);
      return jsonResponse(res, 200, { formations: data });
    }

    if (req.method === 'POST') {
      if (!user) return jsonError(res, 401, 'Non autorisé');
      const { formationId } = req.body;
      if (!formationId) return jsonError(res, 400, 'ID formation requis');

      const { data: formation } = await supabase.from('formations').select('*').eq('id', formationId).single();
      if (!formation) return jsonError(res, 404, 'Formation non trouvée');
      if (formation.status === 'full') return jsonError(res, 400, 'Formation complète');

      const { data: existing } = await supabase.from('user_formations').select('id').eq('user_id', user.userId).eq('formation_id', formationId).single();
      if (existing) return jsonError(res, 400, 'Déjà inscrit');

      await supabase.from('user_formations').insert({ user_id: user.userId, formation_id: formationId });
      await supabase.rpc('increment_xp', { user_id: user.userId, amount: formation.xp_reward });
      await supabase.from('xp_transactions').insert({ user_id: user.userId, amount: formation.xp_reward, reason: `Inscription: ${formation.title}`, source: 'course' });

      return jsonResponse(res, 200, { success: true, message: 'Inscription réussie !' });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
