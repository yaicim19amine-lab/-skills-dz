import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';
import { randomBytes } from 'node:crypto';

const FORMATIONS = {
  'gestion-stock': 'Gestion de stock',
  'dev-web': 'Développement Web Full Stack',
  'ia': 'Intelligence Artificielle',
  'ui-ux': 'UI/UX Design',
  'referent-digital': 'Référent Digital',
  'declarant-douane': 'Déclarant en douane',
  'tourisme-pack': 'Pack Tourisme & Hôtellerie',
  'hse': 'Formation HSE',
  'paramedical-pack': 'Pack Paramédical',
};

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let seg = '';
    for (let i = 0; i < 4; i++) seg += chars[randomBytes(1)[0] % chars.length];
    segments.push(seg);
  }
  return segments.join('-');
}

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk.toString(); });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'POST') req.body = await parseBody(req);

    const user = getUserFromRequest(req);
    if (!user) return jsonError(res, 401, 'Non autorisé');

    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.userId).maybeSingle();
    const isAdmin = profile?.role === 'admin';

    const url = new URL(req.url, `https://${req.headers.host}`);
    const action = url.searchParams.get('action') || req.body?.action;

    if (req.method === 'GET' && action === 'formations') {
      return jsonResponse(res, 200, { formations: FORMATIONS });
    }

    if (req.method === 'POST' && action === 'generate') {
      if (!isAdmin) return jsonError(res, 403, 'Réservé aux administrateurs');

      const { formation_slug, quantity = 1, expires_days, student_email } = req.body;
      if (!formation_slug || !FORMATIONS[formation_slug]) return jsonError(res, 400, 'Formation invalide');

      const qty = Math.min(Math.max(1, parseInt(quantity) || 1), 50);
      const codes = [];

      for (let i = 0; i < qty; i++) {
        let code;
        let attempts = 0;
        do {
          code = generateCode();
          attempts++;
        } while (attempts < 10);

        const expires_at = expires_days
          ? new Date(Date.now() + parseInt(expires_days) * 86400000).toISOString()
          : null;

        const { error } = await supabase.from('access_codes').insert({
          code,
          formation_slug,
          formation_name: FORMATIONS[formation_slug],
          student_email: student_email || null,
          created_by: user.userId,
          expires_at,
        });

        if (!error) codes.push({ code, formation_slug, formation_name: FORMATIONS[formation_slug], expires_at });
      }

      return jsonResponse(res, 201, { success: true, codes, count: codes.length });
    }

    if (req.method === 'POST' && action === 'validate') {
      const { code } = req.body;
      if (!code) return jsonError(res, 400, 'Code requis');

      const { data: codeRecord, error: findError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .maybeSingle();

      if (findError || !codeRecord) return jsonError(res, 404, 'Code invalide');
      if (codeRecord.is_used && codeRecord.used_by !== user.userId) return jsonError(res, 403, 'Code déjà utilisé par un autre utilisateur');
      if (codeRecord.is_used && codeRecord.used_by === user.userId) return jsonResponse(res, 200, { success: true, message: 'Vous avez déjà accès à cette formation', formation_slug: codeRecord.formation_slug, formation_name: codeRecord.formation_name });
      if (codeRecord.expires_at && new Date(codeRecord.expires_at) < new Date()) return jsonError(res, 410, 'Code expiré');

      const { error: updateError } = await supabase
        .from('access_codes')
        .update({ is_used: true, used_by: user.userId, used_at: new Date().toISOString() })
        .eq('id', codeRecord.id);

      if (updateError) return jsonError(res, 500, 'Erreur activation');

      return jsonResponse(res, 200, {
        success: true,
        message: `Accès débloqué : ${codeRecord.formation_name}`,
        formation_slug: codeRecord.formation_slug,
        formation_name: codeRecord.formation_name,
      });
    }

    if (req.method === 'GET' && action === 'my-codes') {
      const { data, error } = await supabase
        .from('access_codes')
        .select('formation_slug, formation_name, used_at, expires_at')
        .eq('used_by', user.userId)
        .order('used_at', { ascending: false });

      if (error) return jsonError(res, 500, error.message);
      return jsonResponse(res, 200, { access: data || [] });
    }

    if (req.method === 'GET' && action === 'list') {
      if (!isAdmin) return jsonError(res, 403, 'Réservé aux administrateurs');

      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) return jsonError(res, 500, error.message);
      return jsonResponse(res, 200, { codes: data || [] });
    }

    if (req.method === 'POST' && action === 'revoke') {
      if (!isAdmin) return jsonError(res, 403, 'Réservé aux administrateurs');

      const { code_id } = req.body;
      if (!code_id) return jsonError(res, 400, 'ID requis');

      const { error } = await supabase.from('access_codes').delete().eq('id', code_id);
      if (error) return jsonError(res, 500, error.message);
      return jsonResponse(res, 200, { success: true, message: 'Code supprimé' });
    }

    return jsonError(res, 405, 'Action non trouvée');
  } catch (err) {
    console.error('[codes] error:', err.message);
    return jsonError(res, 500, 'Erreur serveur');
  }
}
