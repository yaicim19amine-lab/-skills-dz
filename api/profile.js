import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.userId).single();
      if (!profile) return jsonError(res, 404, 'Profil non trouvé');
      return jsonResponse(res, 200, { user: { id: profile.id, firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone, xp: profile.xp, level: profile.level, streak: profile.streak, badges: profile.badges } });
    }

    if (req.method === 'PUT') {
      const { firstName, lastName, phone } = req.body;
      const updates = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (phone !== undefined) updates.phone = phone;
      await supabase.from('profiles').update(updates).eq('id', user.userId);
      return jsonResponse(res, 200, { success: true, message: 'Profil mis à jour' });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
