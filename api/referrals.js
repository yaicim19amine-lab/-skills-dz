import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseForUser, getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';

const REFERRAL_RE = /^SKDZ-[A-Z0-9]{4,32}$/;

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method === 'GET') {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('referrals')
        .select('referrer_id, count:id')
        .eq('status', 'confirmed')
        .order('count', { ascending: false })
        .limit(10);
      if (error) return jsonResponse(res, 200, { leaderboard: [] });

      const referrerIds = (data || []).map(r => r.referrer_id);
      if (referrerIds.length === 0) return jsonResponse(res, 200, { leaderboard: [] });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, xp')
        .in('id', referrerIds);

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      const leaderboard = (data || []).map((r, i) => {
        const p = profileMap[r.referrer_id] || {};
        return {
          rank: i + 1,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Anonyme',
          referrals: r.count,
          xp: (r.count || 0) * 200,
        };
      });

      return jsonResponse(res, 200, { leaderboard });
    } catch { return jsonResponse(res, 200, { leaderboard: [] }); }
  }

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Méthode non autorisée');
  }

  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = getSupabaseForUser(token);
    const code = String(req.body?.code || '').trim().toUpperCase();

    if (!code) return jsonError(res, 400, 'Code de parrainage requis');
    if (!REFERRAL_RE.test(code)) return jsonError(res, 400, 'Format de code invalide');

    const rl = rateLimit(`referral:${user.userId}`, { windowMs: 300000, max: 5 });
    if (!rl.allowed) return jsonError(res, 429, 'Trop de tentatives. Réessayez dans 5 minutes');

    const { data: referrer } = await supabase.from('profiles').select('id, first_name, last_name').eq('referral_code', code).maybeSingle();
    if (!referrer) return jsonError(res, 404, 'Code de parrainage non trouvé');
    if (referrer.id === user.userId) return jsonError(res, 400, 'Vous ne pouvez pas utiliser votre propre code');

    const { data: existing } = await supabase.from('referrals').select('id').eq('referred_id', user.userId).maybeSingle();
    if (existing) return jsonError(res, 400, 'Vous avez déjà utilisé un code de parrainage');

    const { error: insertError } = await supabase.from('referrals').insert({ referrer_id: referrer.id, referred_id: user.userId, status: 'confirmed', reward_xp: 200 });
    if (insertError) return jsonError(res, 409, 'Code déjà utilisé ou invalide');

    const { error: xpError } = await supabase.rpc('award_xp', { p_user_id: referrer.id, p_amount: 200, p_reason: 'Parrainage', p_source: 'referral' });
    if (xpError) return jsonError(res, 500, xpError.message);

    jsonResponse(res, 200, { success: true, message: `Code accepté ! ${referrer.first_name} gagne 200 XP` });
  } catch (err) { jsonError(res, 500, err.message); }
}
