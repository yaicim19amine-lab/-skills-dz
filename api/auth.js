import { handleOptions, setCorsHeaders, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabase, getSupabaseAdmin } from './_lib/supabase.js';
import { signToken, getUserFromRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const url = new URL(req.url, `https://${req.headers.host}`);
  const action = url.searchParams.get('action');

  // Route by action param
  if (req.method === 'POST' && action === 'signup') return handleSignup(req, res);
  if (req.method === 'POST' && action === 'login') return handleLogin(req, res);
  if (req.method === 'POST' && action === 'google') return handleGoogle(req, res);
  if (req.method === 'GET' && action === 'me') return handleMe(req, res);

  return jsonError(res, 405, 'Route non trouvée');
}

async function handleSignup(req, res) {
  try {
    const { email, password, firstName, lastName, phone, referralCode } = req.body;
    if (!email || !password) return jsonError(res, 400, 'Email et mot de passe requis');
    if (password.length < 6) return jsonError(res, 400, 'Mot de passe: 6 caractères minimum');

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) {
      if (authError.message.includes('already registered')) return jsonError(res, 409, 'Email déjà utilisé');
      return jsonError(res, 500, authError.message);
    }

    const userId = authData.user.id;
    const base = (firstName || 'USER').toUpperCase().slice(0, 4);
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    const userReferralCode = `SKDZ-${base}${hash}`;

    let referredBy = null;
    if (referralCode) {
      const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', referralCode).single();
      if (referrer) referredBy = referrer.id;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId, email, first_name: firstName || email.split('@')[0], last_name: lastName || '',
      phone: phone || '', xp: 100, level: 1, streak: 0, badges: ['newcomer'], total_xp: 100,
      referral_code: userReferralCode, referred_by: referredBy,
    });
    if (profileError) return jsonError(res, 500, 'Erreur profil: ' + profileError.message);

    await supabase.from('xp_transactions').insert({ user_id: userId, amount: 100, reason: 'Bienvenue sur Skills DZ !', source: 'bonus' });

    if (referredBy) {
      await supabase.from('referrals').insert({ referrer_id: referredBy, referred_id: userId, status: 'pending', reward_xp: 200 });
      await supabase.rpc('increment_xp', { user_id: referredBy, amount: 200 });
    }

    const token = signToken({ userId, email });
    jsonResponse(res, 201, { user: { id: userId, email, firstName: firstName || email.split('@')[0], lastName: lastName || '', xp: 100, level: 1, badges: ['newcomer'], referralCode: userReferralCode }, token });
  } catch (err) { jsonError(res, 500, err.message); }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return jsonError(res, 400, 'Email et mot de passe requis');

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return jsonError(res, 401, 'Email ou mot de passe incorrect');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
    if (!profile) return jsonError(res, 404, 'Profil non trouvé');

    const token = signToken({ userId: authData.user.id, email });
    jsonResponse(res, 200, { user: { id: authData.user.id, email: profile.email, firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone, xp: profile.xp, level: profile.level, streak: profile.streak, badges: profile.badges, referralCode: profile.referral_code, isAdmin: profile.is_admin }, token });
  } catch (err) { jsonError(res, 500, err.message); }
}

async function handleGoogle(req, res) {
  try {
    const { credential, email: fallbackEmail, name: fallbackName, avatar: fallbackAvatar } = req.body;

    let email, firstName, lastName, avatar, googleId;

    // If we have a Google ID token (credential), verify it
    if (credential) {
      try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!googleRes.ok) return jsonError(res, 401, 'Token Google invalide');
        const googleData = await googleRes.json();
        email = googleData.email;
        firstName = googleData.given_name || email.split('@')[0];
        lastName = googleData.family_name || '';
        avatar = googleData.picture || '';
        googleId = googleData.sub;
      } catch {
        return jsonError(res, 401, 'Erreur vérification Google');
      }
    } else {
      // Fallback for non-OAuth flow
      email = fallbackEmail;
      firstName = fallbackName?.split(' ')[0] || email?.split('@')[0] || 'User';
      lastName = fallbackName?.split(' ').slice(1).join(' ') || '';
      avatar = fallbackAvatar || '';
    }

    if (!email) return jsonError(res, 400, 'Email requis');

    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existing } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (existing) {
      const token = signToken({ userId: existing.id, email });
      return jsonResponse(res, 200, { user: { id: existing.id, email: existing.email, firstName: existing.first_name, lastName: existing.last_name, xp: existing.xp, level: existing.level, streak: existing.streak, badges: existing.badges, referralCode: existing.referral_code, isAdmin: existing.is_admin }, token });
    }

    // Create new user
    const base = firstName.toUpperCase().slice(0, 4);
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomPassword = Math.random().toString(36).slice(-16) + 'A1!';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password: randomPassword, email_confirm: true });
    if (authError) return jsonError(res, 500, authError.message);

    const userReferralCode = `SKDZ-${base}${hash}`;
    await supabase.from('profiles').insert({
      id: authData.user.id, email, first_name: firstName, last_name: lastName, avatar_url: avatar,
      xp: 100, level: 1, streak: 0, badges: ['newcomer'], total_xp: 100, referral_code: userReferralCode,
    });

    await supabase.from('xp_transactions').insert({ user_id: authData.user.id, amount: 100, reason: 'Bienvenue sur Skills DZ !', source: 'bonus' });

    const token = signToken({ userId: authData.user.id, email });
    jsonResponse(res, 201, { user: { id: authData.user.id, email, firstName, lastName, xp: 100, level: 1, badges: ['newcomer'], referralCode: userReferralCode }, token });
  } catch (err) { jsonError(res, 500, err.message); }
}

async function handleMe(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const { data: profile } = await getSupabaseAdmin().from('profiles').select('*').eq('id', user.userId).single();
    if (!profile) return jsonError(res, 404, 'Profil non trouvé');

    jsonResponse(res, 200, { user: { id: profile.id, email: profile.email, firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone, avatarUrl: profile.avatar_url, xp: profile.xp, level: profile.level, streak: profile.streak, badges: profile.badges, totalXp: profile.total_xp, isAdmin: profile.is_admin, referralCode: profile.referral_code, createdAt: profile.created_at } });
  } catch (err) { jsonError(res, 500, err.message); }
}
