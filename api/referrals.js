import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Méthode non autorisée');
  }

  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const supabase = getSupabaseAdmin();
    const { code } = req.body;

    if (!code) return jsonError(res, 400, 'Code de parrainage requis');
    if (!code.startsWith('SKDZ-')) return jsonError(res, 400, 'Format de code invalide');

    const { data: referrer } = await supabase.from('profiles').select('id, first_name, last_name').eq('referral_code', code).single();
    if (!referrer) return jsonError(res, 404, 'Code de parrainage non trouvé');
    if (referrer.id === user.userId) return jsonError(res, 400, 'Vous ne pouvez pas utiliser votre propre code');

    const { data: existing } = await supabase.from('referrals').select('id').eq('referred_id', user.userId).single();
    if (existing) return jsonError(res, 400, 'Vous avez déjà utilisé un code de parrainage');

    await supabase.from('referrals').insert({ referrer_id: referrer.id, referred_id: user.userId, status: 'completed', reward_xp: 200 });
    await supabase.rpc('increment_xp', { user_id: referrer.id, amount: 200 });
    await supabase.from('xp_transactions').insert({ user_id: referrer.id, amount: 200, reason: 'Parrainage', source: 'referral' });

    jsonResponse(res, 200, { success: true, message: `Code accepté ! ${referrer.first_name} gagne 200 XP` });
  } catch (err) { jsonError(res, 500, err.message); }
}
