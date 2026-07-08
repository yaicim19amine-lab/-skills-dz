import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

async function requireAdmin(req) {
  const user = getUserFromRequest(req);
  if (!user) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.userId).single();
  return data?.is_admin ? user : null;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = await requireAdmin(req);
  if (!user) return jsonError(res, 403, 'Accès réservé aux administrateurs');

  try {
    const supabase = getSupabaseAdmin();

    // ─── GET: Dashboard data ───
    if (req.method === 'GET') {
      const { data: users } = await supabase.from('profiles').select('id, email, first_name, last_name, xp, level, badges, is_admin, is_banned, created_at').order('created_at', { ascending: false });
      const { data: formations } = await supabase.from('formations').select('*').order('created_at', { ascending: false });
      const { data: payments } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      const { count: usersCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const paidPayments = (payments || []).filter(p => p.status === 'paid');
      const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount_dzd || 0), 0);

      return jsonResponse(res, 200, {
        users: users || [],
        formations: formations || [],
        payments: payments || [],
        stats: {
          totalUsers: usersCount || 0,
          totalRevenue,
          activeFormations: formations?.filter(f => f.status === 'active').length || 0,
        },
      });
    }

    // ─── POST: Create ───
    if (req.method === 'POST') {
      const body = req.body;

      if (body.action === 'createFormation') {
        const { error } = await supabase.from('formations').insert({
          title: body.title,
          description: body.description || '',
          emoji: body.emoji || '📘',
          duration_weeks: body.duration_weeks || 8,
          price_dzd: body.price_dzd || 0,
          xp_reward: body.xp_reward || 100,
          max_slots: body.max_slots || 20,
          status: body.status || 'active',
        });
        if (error) return jsonError(res, 500, error.message);
        return jsonResponse(res, 200, { success: true, message: 'Formation créée' });
      }

      if (body.action === 'createLive') {
        const { error } = await supabase.from('live_sessions').insert({
          title: body.title,
          scheduled_at: body.date,
          status: body.status || 'scheduled',
          youtube_url: body.youtube_url || '',
        });
        if (error) return jsonError(res, 500, error.message);
        return jsonResponse(res, 200, { success: true, message: 'Session créée' });
      }

      return jsonError(res, 400, 'Action inconnue');
    }

    // ─── PUT: Update ───
    if (req.method === 'PUT') {
      const body = req.body;

      if (body.action === 'ban' || body.action === 'unban') {
        const banVal = body.action === 'ban';
        let success = false;
        try {
          const { error } = await supabase.from('profiles').update({ is_banned: banVal }).eq('id', body.userId);
          if (!error) success = true;
        } catch {}
        return jsonResponse(res, 200, { success: true, message: banVal ? 'Utilisateur banni' : 'Débanni' });
      }

      if (body.action === 'setAdmin') {
        const { error } = await supabase.from('profiles').update({ is_admin: !!body.isAdmin }).eq('id', body.userId);
        if (error) return jsonError(res, 500, error.message);
        return jsonResponse(res, 200, { success: true, message: body.isAdmin ? 'Admin ajouté' : 'Admin retiré' });
      }

      if (body.action === 'updateLive') {
        const { id, date, ...rest } = body;
        const updates = { ...rest };
        if (date) updates.scheduled_at = date;
        const { error } = await supabase.from('live_sessions').update(updates).eq('id', id);
        if (error) return jsonError(res, 500, error.message);
        return jsonResponse(res, 200, { success: true, message: 'Session mise à jour' });
      }

      // Default: update formation (by id)
      if (body.id) {
        const { id, ...updates } = body;
        const { error } = await supabase.from('formations').update(updates).eq('id', id);
        if (error) return jsonError(res, 500, error.message);
        return jsonResponse(res, 200, { success: true, message: 'Formation mise à jour' });
      }

      return jsonError(res, 400, 'Action inconnue');
    }

    // ─── DELETE ───
    if (req.method === 'DELETE') {
      const body = req.body;

      if (body.action === 'deleteFormation') {
        const { error } = await supabase.from('formations').delete().eq('id', body.id);
        if (error) return jsonError(res, 500, error.message);
        return jsonResponse(res, 200, { success: true, message: 'Formation supprimée' });
      }

      if (body.action === 'deleteLive') {
        const { error } = await supabase.from('live_sessions').delete().eq('id', body.id);
        if (error) return jsonError(res, 500, error.message);
        return jsonResponse(res, 200, { success: true, message: 'Session supprimée' });
      }

      return jsonError(res, 400, 'Action inconnue');
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
