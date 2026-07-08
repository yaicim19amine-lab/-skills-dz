import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabase, getSupabaseAdmin } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);

  try {
    const supabase = getSupabaseAdmin();

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
      const { itemId } = req.body;
      if (!itemId) return jsonError(res, 400, 'ID article requis');

      const { data: item } = await supabase.from('shop_items').select('*').eq('id', itemId).eq('is_active', true).single();
      if (!item) return jsonError(res, 404, 'Article non trouvé');
      if (item.stock === 0) return jsonError(res, 400, 'Rupture de stock');

      const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.userId).single();
      if (!profile || profile.xp < item.xp_cost) return jsonError(res, 400, `XP insuffisants (${profile?.xp || 0}/${item.xp_cost})`);

      // Atomic stock decrement to prevent race conditions
      if (item.stock > 0) {
        const { data: updated, error: stockErr } = await supabase
          .from('shop_items')
          .update({ stock: item.stock - 1 })
          .eq('id', itemId)
          .eq('stock', item.stock) // optimistic lock
          .select('stock');
        if (stockErr || !updated || updated.length === 0) {
          return jsonError(res, 409, 'Article plus disponible, stock épuisé');
        }
      }

      await supabase.rpc('decrement_xp', { user_id: user.userId, amount: item.xp_cost });
      await supabase.from('purchases').insert({ user_id: user.userId, item_id: itemId, xp_spent: item.xp_cost, status: 'pending' });
      await supabase.from('xp_transactions').insert({ user_id: user.userId, amount: -item.xp_cost, reason: `Achat: ${item.name}`, source: 'shop' });

      jsonResponse(res, 200, { success: true, message: `"${item.name}" échangé ! -${item.xp_cost} XP`, remainingXp: profile.xp - item.xp_cost });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
