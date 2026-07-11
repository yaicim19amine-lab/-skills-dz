import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      if (req.query?.mine === '1') {
        if (!user) return jsonError(res, 401, 'Non autorisé');
        const { data, error } = await supabase
          .from('user_formations')
          .select('id, progress, enrolled_at, completed_at, formations(*)')
          .eq('user_id', user.userId)
          .order('enrolled_at', { ascending: false });
        if (error) return jsonError(res, 500, error.message);
        const courses = (data || []).map(row => ({
          enrollmentId: row.id,
          progress: row.progress || 0,
          enrolledAt: row.enrolled_at,
          completedAt: row.completed_at,
          ...(row.formations || {}),
        }));
        return jsonResponse(res, 200, { courses });
      }

      const { data, error } = await supabase.from('formations').select('*').order('created_at', { ascending: false });
      if (error) return jsonError(res, 500, error.message);
      return jsonResponse(res, 200, { formations: data });
    }

    if (req.method === 'POST') {
      if (!user) return jsonError(res, 401, 'Non autorisé');
      const { formationId } = req.body;
      if (!formationId) return jsonError(res, 400, 'ID formation requis');
      if (!UUID_RE.test(formationId)) return jsonError(res, 400, 'ID formation invalide');

      const { data, error } = await supabase.rpc('enroll_formation', { p_user_id: user.userId, p_formation_id: formationId });
      if (error) {
        const msg = error.message || '';
        if (msg.includes('formation not found')) return jsonError(res, 404, 'Formation non trouvée');
        if (msg.includes('formation full')) return jsonError(res, 400, 'Formation complète');
        if (msg.includes('already enrolled')) return jsonError(res, 400, 'Déjà inscrit');
        return jsonError(res, 500, msg);
      }

      const result = Array.isArray(data) ? data[0] : data;
      return jsonResponse(res, 200, { success: true, message: 'Inscription réussie !', xp: result?.current_xp, level: result?.current_level, xpAwarded: result?.xp_awarded });
    }

    if (req.method === 'PUT') {
      if (!user) return jsonError(res, 401, 'Non autorisé');
      const { enrollmentId, action } = req.body;
      if (!enrollmentId) return jsonError(res, 400, 'ID d\'inscription requis');
      if (!UUID_RE.test(enrollmentId)) return jsonError(res, 400, 'ID invalide');
      if (!action || !['mark_attendance'].includes(action)) return jsonError(res, 400, 'Action non valide');

      const { data, error } = await supabase
        .from('user_formations')
        .select('id, progress, formations(*)')
        .eq('id', enrollmentId)
        .eq('user_id', user.userId)
        .single();

      if (error) return jsonError(res, 404, 'Inscription non trouvée');
      if (action === 'mark_attendance') {
        const newProgress = Math.min(100, (data.progress || 0) + 20);
        const { error: updateError } = await supabase
          .from('user_formations')
          .update({ progress: newProgress, attended_at: new Date().toISOString() })
          .eq('id', enrollmentId);

        if (updateError) return jsonError(res, 500, updateError.message);

        const { data: xpData, error: xpError } = await supabase.rpc('award_xp', { p_user_id: user.userId, p_amount: 20, p_reason: 'Présence marquée dans formation', p_source: 'attendance' });
        if (xpError) return jsonError(res, 500, xpError.message);

        const xpResult = Array.isArray(xpData) ? xpData[0] : xpData;
        return jsonResponse(res, 200, { success: true, message: 'Présence enregistrée !', xp: xpResult?.xp, level: xpResult?.level, newProgress });
      }
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
