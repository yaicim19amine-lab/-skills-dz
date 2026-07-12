import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseForUser } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';

const XP_EVENTS = {
  game: { source: 'game', maxAmount: 300, dailyCap: 1000, reason: 'Mini-jeu terminé' },
  ai: { source: 'ai', maxAmount: 15, dailyCap: 75, reason: 'Agent IA consulté' },
  form: { source: 'bonus', maxAmount: 20, dailyCap: 60, reason: 'Formulaire rempli' },
  streak: { source: 'bonus', maxAmount: 100, dailyCap: 100, reason: 'Bonus série' },
};

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, 200);
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = getSupabaseForUser(token);

    if (req.method === 'GET') {
      const { data: profile } = await supabase.from('profiles').select('id, email, first_name, last_name, phone, avatar_url, social_instagram, social_linkedin, social_youtube, social_twitter, social_tiktok, xp, level, streak, badges, total_xp, referral_code').eq('id', user.userId).maybeSingle();
      if (!profile) return jsonError(res, 404, 'Profil non trouvé');
      const { count: referralCount } = await supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', user.userId);
      return jsonResponse(res, 200, { user: {
        id: profile.id, firstName: profile.first_name, lastName: profile.last_name,
        phone: profile.phone, email: profile.email, avatarUrl: profile.avatar_url,
        socials: { instagram: profile.social_instagram, linkedin: profile.social_linkedin, youtube: profile.social_youtube, twitter: profile.social_twitter, tiktok: profile.social_tiktok },
        xp: profile.xp, level: profile.level, streak: profile.streak, badges: profile.badges, totalXp: profile.total_xp, referralCode: profile.referral_code, referralCount: referralCount || 0
      } });
    }

    if (req.method === 'PUT') {
      const { firstName, lastName, phone, avatarUrl, socials } = req.body;
      const updates = {};
      if (firstName !== undefined) {
        const val = sanitize(firstName);
        if (!val || val.length > 100) return jsonError(res, 400, 'Prénom invalide (1-100 caractères)');
        updates.first_name = val;
      }
      if (lastName !== undefined) {
        const val = sanitize(lastName);
        if (val.length > 100) return jsonError(res, 400, 'Nom trop long (max 100)');
        updates.last_name = val;
      }
      if (phone !== undefined) {
        const val = sanitize(phone);
        if (val && !/^[\d\s+\-()]{8,20}$/.test(val)) return jsonError(res, 400, 'Format téléphone invalide');
        updates.phone = val;
      }
      if (avatarUrl !== undefined) {
        const val = sanitize(avatarUrl);
        if (val && !/^https?:\/\/.+(\.(jpg|jpeg|png|gif|webp|svg)|\/.+)$/.test(val)) return jsonError(res, 400, 'URL image invalide');
        updates.avatar_url = val || null;
      }
      if (socials && typeof socials === 'object') {
        const platforms = ['instagram', 'linkedin', 'youtube', 'twitter', 'tiktok'];
        for (const p of platforms) {
          if (socials[p] !== undefined) {
            const val = sanitize(socials[p]);
            if (val && !/^https?:\/\/(www\.)?.+\..+/.test(val)) return jsonError(res, 400, `URL ${p} invalide`);
            updates[`social_${p}`] = val || null;
          }
        }
      }
      if (Object.keys(updates).length === 0) return jsonError(res, 400, 'Aucune donnée à modifier');
      await supabase.from('profiles').update(updates).eq('id', user.userId);
      return jsonResponse(res, 200, { success: true, message: 'Profil mis à jour' });
    }

    if (req.method === 'POST') {
      const { action, eventType, amount, reason } = req.body || {};
      if (action !== 'xpEvent') return jsonError(res, 400, 'Action inconnue');

      const config = XP_EVENTS[eventType];
      if (!config) return jsonError(res, 400, 'Type XP invalide');

      const xpAmount = Number.parseInt(amount, 10);
      if (!Number.isFinite(xpAmount) || xpAmount <= 0 || xpAmount > config.maxAmount) {
        return jsonError(res, 400, `Montant XP invalide (max ${config.maxAmount})`);
      }

      const rl = rateLimit(`xp:${user.userId}:${eventType}`, { windowMs: 60000, max: 12 });
      if (!rl.allowed) return jsonError(res, 429, 'Trop d\'actions XP. Réessayez dans 1 minute');

      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const { data: todayTx, error: txError } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('user_id', user.userId)
        .eq('source', config.source)
        .gt('amount', 0)
        .gte('created_at', dayStart.toISOString())
        .limit(200);
      if (txError) return jsonError(res, 500, txError.message);

      const earnedToday = (todayTx || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
      if (earnedToday + xpAmount > config.dailyCap) {
        return jsonError(res, 429, `Limite XP quotidienne atteinte pour ${eventType}`);
      }

      const cleanReason = sanitize(reason || config.reason).slice(0, 200) || config.reason;
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: user.userId,
        p_amount: xpAmount,
        p_reason: cleanReason,
        p_source: config.source,
      });
      if (error) return jsonError(res, 500, error.message);

      const result = Array.isArray(data) ? data[0] : data;
      return jsonResponse(res, 200, { success: true, xp: result?.xp, level: result?.level, totalXp: result?.total_xp, awarded: xpAmount });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, 'Erreur serveur'); }
}
