import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
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
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.userId).maybeSingle();
      if (!profile) return jsonError(res, 404, 'Profil non trouvé');
      return jsonResponse(res, 200, { user: { id: profile.id, firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone, xp: profile.xp, level: profile.level, streak: profile.streak, badges: profile.badges } });
    }

    if (req.method === 'PUT') {
      const { firstName, lastName, phone } = req.body;
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

    if (req.method === 'PUT') {
      const { action, coursId, enrollmentId, formationId } = req.body || {};
      if (!action) return jsonError(res, 400, 'Action requise');

      if (action === 'markCoursPresence') {
        if (!coursId || !enrollmentId) return jsonError(res, 400, 'ID cours et ID d\'inscription requis');

        const { data, error } = await supabase
          .from('user_formations')
          .select('id, progress, formations(*)')
          .eq('id', enrollmentId)
          .eq('user_id', user.userId)
          .single();

        if (error) return jsonError(res, 404, 'Inscription non trouvée');

        const newProgress = Math.min(100, (data.progress || 0) + 20);
        const { error: updateError } = await supabase
          .from('user_formations')
          .update({ progress: newProgress, attended_at: new Date().toISOString() })
          .eq('id', enrollmentId);

        if (updateError) return jsonError(res, 500, updateError.message);

        const { data: xpData, error: xpError } = await supabase.rpc('award_xp', {
          p_user_id: user.userId,
          p_amount: 20,
          p_reason: 'Présence marquée dans formation',
          p_source: 'attendance'
        });
        if (xpError) return jsonError(res, 500, xpError.message);

        const xpResult = Array.isArray(xpData) ? xpData[0] : xpData;
        return jsonResponse(res, 200, { success: true, message: 'Présence enregistrée !' });
      }

      if (action === 'enrollFormation') {
        if (!formationId) return jsonError(res, 400, 'ID formation requis');

        const { data, error } = await supabase.rpc('enroll_formation', {
          p_user_id: user.userId,
          p_formation_id: formationId
        });
        if (error) {
          const msg = error.message || '';
          if (msg.includes('formation not found')) return jsonError(res, 404, 'Formation non trouvée');
          if (msg.includes('formation full')) return jsonError(res, 400, 'Formation complète');
          if (msg.includes('already enrolled')) return jsonError(res, 400, 'Déjà inscrit');
          return jsonError(res, 500, msg);
        }

        const result = Array.isArray(data) ? data[0] : data;
        return jsonResponse(res, 200, { success: true, message: 'Inscription réussie !' });
      }
    }

    if (req.method === 'DELETE') {
      const { action, paymentId } = req.body || {};
      if (!action) return jsonError(res, 400, 'Action requise');

      if (action === 'approvePayment') {
        if (!paymentId) return jsonError(res, 400, 'ID paiement requis');

        const updates = {
          status: 'paid',
          paid_at: new Date().toISOString(),
          confirmed_by: user.userId,
          admin_note: cleanText(req.body.adminNote || '', 500),
          payment_proof_url: req.body.paymentProofUrl || null
        };
        const { data, error } = await supabase
          .from('payments')
          .update(updates)
          .eq('id', paymentId)
          .single();
        if (error) return jsonError(res, 500, error.message);

        await audit(supabase, user.userId, 'approve', 'payment', paymentId, { amount_dzd: data.amount_dzd, method: data.method });
        return jsonResponse(res, 200, { success: true, payment: data, message: 'Paiement approuvé' });
      }

      if (action === 'rejectPayment') {
        if (!paymentId) return jsonError(res, 400, 'ID paiement requis');

        const note = cleanText(req.body.adminNote || '', 500);
        const updates = {
          status: 'failed',
          confirmed_by: user.userId,
          paid_at: null,
          admin_note: note || null
        };
        const { data, error } = await supabase
          .from('payments')
          .update(updates)
          .eq('id', paymentId)
          .single();
        if (error) return jsonError(res, 500, error.message);

        await audit(supabase, user.userId, 'reject', 'payment', paymentId, { amount_dzd: data.amount_dzd, method: data.method });
        return jsonResponse(res, 200, { success: true, payment: data, message: 'Paiement rejeté' });
      }
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
