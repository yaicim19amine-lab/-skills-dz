import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseForUser } from './_lib/supabase.js';
import { getUserFromRequest } from './_lib/auth.js';
import { rateLimit, getClientIp } from './_lib/rateLimit.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const user = getUserFromRequest(req);

  try {
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = getSupabaseForUser(token);

    if (req.method === 'GET') {
      if (!user) return jsonError(res, 401, 'Non autorisé');
      const { data } = await supabase.from('payments').select('*').eq('user_id', user.userId).order('created_at', { ascending: false }).limit(50);
      return jsonResponse(res, 200, { payments: data || [] });
    }

    if (req.method === 'POST') {
      if (!user) return jsonError(res, 401, 'Non autorisé');
      const ip = getClientIp(req);
      const rl = rateLimit(`pay:${user.userId}`, { windowMs: 300000, max: 5 });
      if (!rl.allowed) return jsonError(res, 429, 'Trop de paiements. Réessayez dans 5 minutes');
      const { amount, method, reference } = req.body;
      if (!amount || amount <= 0) return jsonError(res, 400, 'Montant invalide');
      if (amount < 500) return jsonError(res, 400, 'Montant minimum: 500 DA');
      if (amount > 500000) return jsonError(res, 400, 'Montant maximum: 500,000 DA');
      if (!['cib', 'redotpay', 'bybit'].includes(method)) return jsonError(res, 400, 'Méthode invalide');

      const paymentRef = reference || `SKDZ-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase.from('payments').insert({ user_id: user.userId, amount_dzd: amount, method, status: 'pending', reference: paymentRef }).select().single();
      if (error) return jsonError(res, 500, error.message);

      let instructions = {};
      if (method === 'cib') {
        instructions = {
          title: 'Paiement CIB / BaridiMob', amount, reference: paymentRef,
          steps: ['Ouvrez BaridiMob', 'Transfert vers 0656471547', `Montant: ${amount} DA`, `Réf: ${paymentRef}`, 'Envoyez preuve par WhatsApp'],
          qrData: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BARIDIMOB:${amount}:0656471547:${paymentRef}`,
        };
      } else if (method === 'redotpay') {
        instructions = {
          title: 'RedotPay (Crypto)', wallet: 'TLeFDN5FCvBqjHhGVpJrZrC3C4g2gP5x7Q', network: 'TRC20',
          amountUSDT: Math.round(amount / 135), reference: paymentRef,
          steps: ['Ouvrez wallet', `Envoyez ${Math.round(amount/135)} USDT TRC20`, 'Adresse: TLeFDN5FCvBqjHhGVpJrZrC3C4g2gP5x7Q', 'Envoyez hash par WhatsApp'],
        };
      } else {
        instructions = {
          title: 'Bybit P2P', seller: 'SkillsDZ_Trader', amount, reference: paymentRef,
          steps: ['Bybit → P2P → Acheter USDT', `Montant: ${amount} DA`, 'Vendeur: SkillsDZ_Trader', `Note: ${paymentRef}`, 'Payer par CIB', 'Envoyer preuve'],
        };
      }

      return jsonResponse(res, 201, { success: true, payment: { id: data.id, reference: paymentRef, status: 'pending' }, instructions });
    }

    jsonError(res, 405, 'Méthode non autorisée');
  } catch (err) { jsonError(res, 500, err.message); }
}
