import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORMATION_STATUSES = new Set(['active', 'upcoming', 'full']);
const LIVE_STATUSES = new Set(['scheduled', 'live', 'ended']);
const TASK_STATUSES = new Set(['todo', 'doing', 'done', 'cancelled']);
const TASK_PRIORITIES = new Set(['low', 'medium', 'high']);

function cleanText(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').trim().slice(0, max);
}

function cleanPositiveInt(value, fallback, max = 1000) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

function cleanMoney(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, 1000000);
}

function cleanDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function audit(supabase, actorId, action, entityType, entityId, metadata = {}) {
  await supabase.from('admin_audit_logs').insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
    metadata,
  }).catch(() => {});
}

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
      const { data: tasks } = await supabase.from('admin_tasks').select('*').order('created_at', { ascending: false }).limit(100);
      const { data: auditLogs } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      const { count: usersCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const paidPayments = (payments || []).filter(p => p.status === 'paid');
      const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount_dzd || 0), 0);

      return jsonResponse(res, 200, {
        users: users || [],
        formations: formations || [],
        payments: payments || [],
        tasks: tasks || [],
        auditLogs: auditLogs || [],
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
        const title = cleanText(body.title, 120);
        if (!title) return jsonError(res, 400, 'Titre requis');
        const status = FORMATION_STATUSES.has(body.status) ? body.status : 'active';
        const { error } = await supabase.from('formations').insert({
          title,
          description: cleanText(body.description || '', 1200),
          emoji: cleanText(body.emoji || '📘', 8) || '📘',
          duration_weeks: cleanPositiveInt(body.duration_weeks, 8, 104),
          days_per_week: cleanPositiveInt(body.days_per_week, 5, 7),
          hours_per_day: cleanPositiveInt(body.hours_per_day, 3, 24),
          price_dzd: cleanMoney(body.price_dzd, 0),
          xp_reward: cleanPositiveInt(body.xp_reward, 100, 10000),
          max_slots: cleanPositiveInt(body.max_slots, 20, 1000),
          status,
        });
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'create', 'formation', null, { title, status });
        return jsonResponse(res, 200, { success: true, message: 'Formation créée' });
      }

      if (body.action === 'createLive') {
        const title = cleanText(body.title, 120);
        if (!title) return jsonError(res, 400, 'Titre requis');
        const status = LIVE_STATUSES.has(body.status) ? body.status : 'scheduled';
        const { error } = await supabase.from('live_sessions').insert({
          title,
          scheduled_at: body.date,
          status,
          youtube_url: cleanText(body.youtube_url || '', 500),
        });
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'create', 'live_session', null, { title, status });
        return jsonResponse(res, 200, { success: true, message: 'Session créée' });
      }

      if (body.action === 'createTask') {
        const title = cleanText(body.title, 160);
        if (!title) return jsonError(res, 400, 'Titre tâche requis');
        const priority = TASK_PRIORITIES.has(body.priority) ? body.priority : 'medium';
        const status = TASK_STATUSES.has(body.status) ? body.status : 'todo';
        const assigneeId = UUID_RE.test(body.assigneeId || '') ? body.assigneeId : null;
        const relatedUserId = UUID_RE.test(body.relatedUserId || '') ? body.relatedUserId : null;
        const { data, error } = await supabase.from('admin_tasks').insert({
          title,
          description: cleanText(body.description || '', 1000),
          priority,
          status,
          assignee_id: assigneeId,
          related_user_id: relatedUserId,
          due_at: cleanDate(body.dueAt),
          created_by: user.userId,
        }).select().single();
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'create', 'admin_task', data.id, { title, priority, status });
        return jsonResponse(res, 200, { success: true, task: data, message: 'Tâche créée' });
      }

      if (body.action === 'saveSettings') {
        const settings = body.settings || {};
        const allowedKeys = [
          'notif_new_signups', 'notif_pending_payments', 'notif_weekly_report', 'notif_live_sessions',
          'appearance_dark_mode', 'appearance_reduced_animations', 'appearance_compact_mode',
          'security_2fa', 'security_email_only', 'security_login_history',
          'platform_registration_open', 'platform_ai_agents', 'platform_mini_games',
          'platform_referral_system', 'platform_xp_shop',
          'gamification_show_badges', 'gamification_leaderboard', 'gamification_xp_notifications', 'gamification_streak',
        ];
        const cleanSettings = {};
        for (const key of allowedKeys) {
          if (key in settings) cleanSettings[key] = !!settings[key];
        }
        const { error } = await supabase.from('profiles').update({ settings: cleanSettings }).eq('id', user.userId);
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'saveSettings', 'settings', user.userId, cleanSettings);
        return jsonResponse(res, 200, { success: true, message: 'Paramètres sauvegardés' });
      }

      if (body.action === 'getSettings') {
        const { data } = await supabase.from('profiles').select('settings').eq('id', user.userId).single();
        return jsonResponse(res, 200, { settings: data?.settings || {} });
      }

      return jsonError(res, 400, 'Action inconnue');
    }

    // ─── PUT: Update ───
    if (req.method === 'PUT') {
      const body = req.body;

      if (body.action === 'ban' || body.action === 'unban') {
        if (!UUID_RE.test(body.userId || '')) return jsonError(res, 400, 'ID utilisateur invalide');
        const banVal = body.action === 'ban';
        let success = false;
        try {
          const { error } = await supabase.from('profiles').update({ is_banned: banVal }).eq('id', body.userId);
          if (!error) success = true;
        } catch {}
        if (success) await audit(supabase, user.userId, body.action, 'profile', body.userId, { is_banned: banVal });
        return jsonResponse(res, 200, { success, message: banVal ? 'Utilisateur banni' : 'Débanni' });
      }

      if (body.action === 'setAdmin') {
        if (!UUID_RE.test(body.userId || '')) return jsonError(res, 400, 'ID utilisateur invalide');
        const { error } = await supabase.from('profiles').update({ is_admin: !!body.isAdmin }).eq('id', body.userId);
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'setAdmin', 'profile', body.userId, { is_admin: !!body.isAdmin });
        return jsonResponse(res, 200, { success: true, message: body.isAdmin ? 'Admin ajouté' : 'Admin retiré' });
      }

      if (body.action === 'approvePayment' || body.action === 'rejectPayment') {
        if (!UUID_RE.test(body.paymentId || '')) return jsonError(res, 400, 'ID paiement invalide');
        const approved = body.action === 'approvePayment';
        const updates = {
          status: approved ? 'paid' : 'failed',
          confirmed_by: user.userId,
          paid_at: approved ? new Date().toISOString() : null,
          admin_note: cleanText(body.adminNote || '', 500),
        };
        const { data, error } = await supabase.from('payments').update(updates).eq('id', body.paymentId).select().single();
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, approved ? 'approve' : 'reject', 'payment', body.paymentId, { amount_dzd: data.amount_dzd, method: data.method });
        return jsonResponse(res, 200, { success: true, payment: data, message: approved ? 'Paiement validé' : 'Paiement rejeté' });
      }

      if (body.action === 'updateTask') {
        if (!UUID_RE.test(body.id || '')) return jsonError(res, 400, 'ID tâche invalide');
        const updates = {};
        if (body.title !== undefined) {
          const title = cleanText(body.title, 160);
          if (!title) return jsonError(res, 400, 'Titre tâche requis');
          updates.title = title;
        }
        if (body.description !== undefined) updates.description = cleanText(body.description || '', 1000);
        if (body.status !== undefined) {
          if (!TASK_STATUSES.has(body.status)) return jsonError(res, 400, 'Statut tâche invalide');
          updates.status = body.status;
        }
        if (body.priority !== undefined) {
          if (!TASK_PRIORITIES.has(body.priority)) return jsonError(res, 400, 'Priorité tâche invalide');
          updates.priority = body.priority;
        }
        if (body.assigneeId !== undefined) updates.assignee_id = UUID_RE.test(body.assigneeId || '') ? body.assigneeId : null;
        if (body.relatedUserId !== undefined) updates.related_user_id = UUID_RE.test(body.relatedUserId || '') ? body.relatedUserId : null;
        if (body.dueAt !== undefined) updates.due_at = cleanDate(body.dueAt);
        if (Object.keys(updates).length === 0) return jsonError(res, 400, 'Aucune donnée à modifier');
        const { data, error } = await supabase.from('admin_tasks').update(updates).eq('id', body.id).select().single();
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'update', 'admin_task', body.id, updates);
        return jsonResponse(res, 200, { success: true, task: data, message: 'Tâche mise à jour' });
      }

      if (body.action === 'updateLive') {
        const ALLOWED_LIVE_FIELDS = ['title', 'speaker', 'youtube_url', 'status', 'scheduled_at'];
        const { id, date, ...rest } = body;
        if (!UUID_RE.test(id || '')) return jsonError(res, 400, 'ID session invalide');
        const updates = {};
        for (const key of ALLOWED_LIVE_FIELDS) {
          if (key === 'scheduled_at' && date) { updates.scheduled_at = date; continue; }
          if (rest[key] === undefined) continue;
          if (key === 'status') {
            if (!LIVE_STATUSES.has(rest[key])) return jsonError(res, 400, 'Statut live invalide');
            updates[key] = rest[key];
          } else {
            updates[key] = cleanText(rest[key], key === 'youtube_url' ? 500 : 200);
          }
        }
        if (Object.keys(updates).length === 0) return jsonError(res, 400, 'Aucune donnée à modifier');
        const { error } = await supabase.from('live_sessions').update(updates).eq('id', id);
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'update', 'live_session', id, updates);
        return jsonResponse(res, 200, { success: true, message: 'Session mise à jour' });
      }

      // Default: update formation (by id)
      if (body.id) {
        const ALLOWED_FORMATION_FIELDS = ['title', 'description', 'emoji', 'duration_weeks', 'days_per_week', 'hours_per_day', 'max_slots', 'price_dzd', 'xp_reward', 'status'];
        const { id, ...rest } = body;
        if (!UUID_RE.test(id || '')) return jsonError(res, 400, 'ID formation invalide');
        const updates = {};
        for (const key of ALLOWED_FORMATION_FIELDS) {
          if (rest[key] === undefined) continue;
          if (key === 'status') {
            if (!FORMATION_STATUSES.has(rest[key])) return jsonError(res, 400, 'Statut formation invalide');
            updates[key] = rest[key];
          } else if (['duration_weeks', 'days_per_week', 'hours_per_day', 'max_slots', 'xp_reward'].includes(key)) {
            const max = key === 'duration_weeks' ? 104 : key === 'days_per_week' ? 7 : key === 'hours_per_day' ? 24 : 10000;
            updates[key] = cleanPositiveInt(rest[key], 0, max);
          } else if (key === 'price_dzd') {
            updates[key] = cleanMoney(rest[key], 0);
          } else {
            updates[key] = cleanText(rest[key], key === 'description' ? 1200 : 120);
          }
        }
        if (Object.keys(updates).length === 0) return jsonError(res, 400, 'Aucune donnée à modifier');
        const { error } = await supabase.from('formations').update(updates).eq('id', id);
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'update', 'formation', id, updates);
        return jsonResponse(res, 200, { success: true, message: 'Formation mise à jour' });
      }

      return jsonError(res, 400, 'Action inconnue');
    }

    // ─── DELETE ───
    if (req.method === 'DELETE') {
      const body = req.body;

      if (body.action === 'deleteFormation') {
        if (!UUID_RE.test(body.id || '')) return jsonError(res, 400, 'ID formation invalide');
        const { error } = await supabase.from('formations').delete().eq('id', body.id);
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'delete', 'formation', body.id);
        return jsonResponse(res, 200, { success: true, message: 'Formation supprimée' });
      }

      if (body.action === 'deleteLive') {
        if (!UUID_RE.test(body.id || '')) return jsonError(res, 400, 'ID session invalide');
        const { error } = await supabase.from('live_sessions').delete().eq('id', body.id);
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'delete', 'live_session', body.id);
        return jsonResponse(res, 200, { success: true, message: 'Session supprimée' });
      }

      if (body.action === 'deleteTask') {
        if (!UUID_RE.test(body.id || '')) return jsonError(res, 400, 'ID tâche invalide');
        const { error } = await supabase.from('admin_tasks').delete().eq('id', body.id);
        if (error) return jsonError(res, 500, error.message);
        await audit(supabase, user.userId, 'delete', 'admin_task', body.id);
        return jsonResponse(res, 200, { success: true, message: 'Tâche supprimée' });
      }

      return jsonError(res, 400, 'Action inconnue');
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
