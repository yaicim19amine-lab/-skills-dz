import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { rateLimit, getClientIp } from './_lib/rateLimit.js';

function sanitize(str, max = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, max);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Méthode non autorisée');
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`leads:${ip}`, { windowMs: 300000, max: 5 });
  if (!rl.allowed) return jsonError(res, 429, 'Trop de demandes. Réessayez dans 5 minutes');

  try {
    const { name, email, phone, formation } = req.body || {};

    if (!name || !email || !phone) {
      return jsonError(res, 400, 'Nom, email et téléphone requis');
    }

    const cleanName = sanitize(name, 100);
    const cleanEmail = sanitize(email, 200);
    const cleanPhone = sanitize(phone, 20);
    const cleanFormation = sanitize(formation || '', 100);

    if (!cleanName || cleanName.length < 2) return jsonError(res, 400, 'Nom invalide');
    if (!validateEmail(cleanEmail)) return jsonError(res, 400, 'Email invalide');
    if (!/^[\d\s+\-()]{8,20}$/.test(cleanPhone)) return jsonError(res, 400, 'Téléphone invalide');

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('leads').insert({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      formation: cleanFormation,
      source: 'landing_page',
      ip_address: ip,
    });

    if (error) {
      if (error.message.includes('relation "leads" does not exist')) {
        await supabase.from('admin_tasks').insert({
          title: `Lead: ${cleanName} (${cleanFormation || 'Non spécifié'})`,
          description: `Nom: ${cleanName}\nEmail: ${cleanEmail}\nTél: ${cleanPhone}\nFormation: ${cleanFormation || 'Non spécifié'}`,
          status: 'todo',
          priority: 'high',
        });
        return jsonResponse(res, 200, { success: true, message: 'Votre demande a été enregistrée. Nous vous contacterons sous 24h.' });
      }
      return jsonError(res, 500, 'Erreur serveur');
    }

    jsonResponse(res, 200, { success: true, message: 'Votre demande a été enregistrée. Nous vous contacterons sous 24h.' });
  } catch (err) {
    jsonError(res, 500, 'Erreur serveur');
  }
}
