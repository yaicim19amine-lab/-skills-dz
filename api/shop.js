import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseForUser } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';
import { rateLimit } from './_lib/rateLimit.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);

  try {
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = getSupabaseForUser(token);

    if (req.method === 'GET') {
      const { category } = req.query;
      let query = supabase.from('shop_items').select('*').eq('is_active', true).order('xp_cost');
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) return jsonError(res, 500, error.message);
      return jsonResponse(res, 200, { items: data });
    }

    if (req.method === 'POST') {
      if (!user) return jsonError(res, 401, 'Non autorisé');
      const rl = rateLimit(`shop:${user.userId}`, { windowMs: 60000, max: 10 });
      if (!rl.allowed) return jsonError(res, 429, 'Trop d\'achats. Réessayez dans 1 minute');
      const { itemId } = req.body;
      if (!itemId) return jsonError(res, 400, 'ID article requis');

      const { data, error } = await supabase.rpc('purchase_item', { p_user_id: user.userId, p_item_id: itemId });
      if (error) {
        const msg = error.message || '';
        if (msg.includes('item not found')) return jsonError(res, 404, 'Article non trouvé');
        if (msg.includes('out of stock')) return jsonError(res, 400, 'Rupture de stock');
        if (msg.includes('insufficient xp')) return jsonError(res, 400, 'XP insuffisants');
        return jsonError(res, 500, msg);
      }

      const result = Array.isArray(data) ? data[0] : data;
      jsonResponse(res, 200, { success: true, message: 'Article échangé !', remainingXp: result?.remaining_xp, purchaseId: result?.purchase_id });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
