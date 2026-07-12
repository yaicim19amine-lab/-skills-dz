import { randomBytes } from 'node:crypto';
import { handleOptions, jsonError, jsonResponse } from './_lib/cors.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
import { signToken, getUserFromRequest } from './_lib/auth.js';
import { rateLimit, getClientIp } from './_lib/rateLimit.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '955972307453-mr42bpr42dnuvlu1t068udn5i268pjed.apps.googleusercontent.com';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (password.length < 8) return 'Mot de passe: 8 caractères minimum';
  if (!/[A-Z]/.test(password)) return 'Mot de passe: au moins 1 majuscule';
  if (!/[a-z]/.test(password)) return 'Mot de passe: au moins 1 minuscule';
  if (!/[0-9]/.test(password)) return 'Mot de passe: au moins 1 chiffre';
  return null;
}

function sanitizeText(value, max = 100) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').trim().slice(0, max);
}

async function generateReferralCode(supabase, firstName) {
  const base = sanitizeText(firstName || 'USER', 12).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'USER';
  for (let attempts = 0; attempts < 10; attempts++) {
    const hash = randomBytes(4).toString('hex').toUpperCase();
    const code = `SKDZ-${base}${hash}`;
    const { data: existing } = await supabase.from('profiles').select('id').eq('referral_code', code).maybeSingle();
    if (!existing) return code;
  }
  throw new Error('Erreur génération code parrainage');
}

function generateSecurePassword() {
  return `${randomBytes(18).toString('base64url')}A1!`;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const ip = getClientIp(req);
  const rl = rateLimit(`auth:${ip}`, { windowMs: 60000, max: 15 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', rl.retryAfter);
    return jsonError(res, 429, `Trop de tentatives. Réessayez dans ${rl.retryAfter}s`);
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const action = url.searchParams.get('action');

  if (req.method === 'POST' && action === 'signup') return handleSignup(req, res);
  if (req.method === 'POST' && action === 'login') return handleLogin(req, res);
  if (req.method === 'POST' && action === 'google') return handleGoogle(req, res);
  if (req.method === 'POST' && action === 'forgot-password') return handleForgotPassword(req, res);
  if (req.method === 'GET' && action === 'me') return handleMe(req, res);

  return jsonError(res, 405, 'Route non trouvée');
}

async function handleSignup(req, res) {
  try {
    const { email, password, firstName, lastName, phone, referralCode } = req.body;
    if (!email || !password) return jsonError(res, 400, 'Email et mot de passe requis');
    if (!validateEmail(email)) return jsonError(res, 400, 'Format email invalide');
    const pwdError = validatePassword(password);
    if (pwdError) return jsonError(res, 400, pwdError);

    const supabase = getSupabaseAdmin();
    const { data: adminProfile } = await supabase.from('profiles').select('settings').eq('is_admin', true).limit(1).maybeSingle();
    const settings = adminProfile?.settings || {};
    if (settings.platform_registration_open === false) {
      return jsonError(res, 403, 'Les inscriptions sont temporairement fermées');
    }

    const cleanFirstName = sanitizeText(firstName || email.split('@')[0], 100);
    const cleanLastName = sanitizeText(lastName || '', 100);
    const cleanPhone = sanitizeText(phone || '', 20);
    const cleanReferralCode = sanitizeText(referralCode || '', 40).toUpperCase();
    if (!cleanFirstName) return jsonError(res, 400, 'Prénom invalide');
    if (cleanPhone && !/^[\d\s+\-()]{8,20}$/.test(cleanPhone)) return jsonError(res, 400, 'Format téléphone invalide');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) {
      if (authError.message.includes('already registered')) return jsonError(res, 409, 'Email déjà utilisé');
      return jsonError(res, 500, authError.message);
    }

    const userId = authData.user.id;
    const userReferralCode = await generateReferralCode(supabase, cleanFirstName);

    let referredBy = null;
    if (cleanReferralCode) {
      const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', cleanReferralCode).maybeSingle();
      if (referrer) referredBy = referrer.id;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId, email, first_name: cleanFirstName, last_name: cleanLastName,
      phone: cleanPhone, xp: 100, level: 2, streak: 0, badges: ['newcomer'], total_xp: 100,
      referral_code: userReferralCode, referred_by: referredBy,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
      return jsonError(res, 500, 'Erreur profil: ' + profileError.message);
    }

    await supabase.from('xp_transactions').insert({ user_id: userId, amount: 100, reason: 'Bienvenue sur Skills DZ !', source: 'bonus' });

    if (referredBy) {
      await supabase.from('referrals').insert({ referrer_id: referredBy, referred_id: userId, status: 'confirmed', reward_xp: 200 });
      await supabase.rpc('award_xp', { p_user_id: referredBy, p_amount: 200, p_reason: 'Parrainage', p_source: 'referral' });
    }

    const token = signToken({ userId, email });
    jsonResponse(res, 201, { user: { id: userId, email, firstName: cleanFirstName, lastName: cleanLastName, xp: 100, level: 2, badges: ['newcomer'], referralCode: userReferralCode }, token });
  } catch (err) { jsonError(res, 500, 'Erreur serveur'); }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return jsonError(res, 400, 'Email et mot de passe requis');
    if (!validateEmail(email)) return jsonError(res, 400, 'Format email invalide');

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return jsonError(res, 401, 'Email ou mot de passe incorrect');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle();
    if (!profile) return jsonError(res, 404, 'Profil non trouvé');

    if (profile.is_banned) return jsonError(res, 403, 'Compte suspendu. Contactez le support.');

    const token = signToken({ userId: authData.user.id, email });
    jsonResponse(res, 200, { user: { id: authData.user.id, email: profile.email, firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone, xp: profile.xp, level: profile.level, streak: profile.streak, badges: profile.badges, referralCode: profile.referral_code, isAdmin: profile.is_admin }, token });
  } catch (err) { jsonError(res, 500, 'Erreur serveur'); }
}

async function handleForgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return jsonError(res, 400, 'Email requis');
    if (!validateEmail(email)) return jsonError(res, 400, 'Format email invalide');

    const ip = getClientIp(req);
    const rl = rateLimit(`forgot:${ip}`, { windowMs: 300000, max: 3 });
    if (!rl.allowed) return jsonError(res, 429, 'Trop de demandes. Réessayez dans 5 minutes');

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL || 'https://skills-dz.vercel.app'}/pages/login.html`,
    });

    // Always return success to prevent email enumeration
    jsonResponse(res, 200, { success: true, message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
  } catch (err) { jsonError(res, 500, 'Erreur serveur'); }
}

async function handleGoogle(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) return jsonError(res, 400, 'Token Google requis');

    let email, firstName, lastName, avatar, googleId;
    try {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!googleRes.ok) return jsonError(res, 401, 'Token Google invalide');
      const googleData = await googleRes.json();
      if (googleData.aud !== GOOGLE_CLIENT_ID) return jsonError(res, 401, 'Client Google invalide');
      if (googleData.email_verified !== 'true' && googleData.email_verified !== true) return jsonError(res, 401, 'Email Google non vérifié');
      email = googleData.email;
      firstName = sanitizeText(googleData.given_name || email.split('@')[0], 100);
      lastName = sanitizeText(googleData.family_name || '', 100);
      avatar = sanitizeText(googleData.picture || '', 500);
      googleId = googleData.sub;
    } catch {
      return jsonError(res, 401, 'Erreur vérification Google');
    }

    if (!email) return jsonError(res, 400, 'Email requis');

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    if (existing) {
      const token = signToken({ userId: existing.id, email });
      return jsonResponse(res, 200, { user: { id: existing.id, email: existing.email, firstName: existing.first_name, lastName: existing.last_name, xp: existing.xp, level: existing.level, streak: existing.streak, badges: existing.badges, referralCode: existing.referral_code, isAdmin: existing.is_admin }, token });
    }

    const randomPassword = generateSecurePassword();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password: randomPassword, email_confirm: true });
    if (authError) return jsonError(res, 500, authError.message);

    const userReferralCode = await generateReferralCode(supabase, firstName);
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id, email, first_name: firstName, last_name: lastName, avatar_url: avatar,
      xp: 100, level: 2, streak: 0, badges: ['newcomer'], total_xp: 100, referral_code: userReferralCode,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return jsonError(res, 500, 'Erreur profil: ' + profileError.message);
    }

    await supabase.from('xp_transactions').insert({ user_id: authData.user.id, amount: 100, reason: 'Bienvenue sur Skills DZ !', source: 'bonus' });

    const token = signToken({ userId: authData.user.id, email });
    jsonResponse(res, 201, { user: { id: authData.user.id, email, firstName, lastName, xp: 100, level: 2, streak: 0, badges: ['newcomer'], isAdmin: false, referralCode: userReferralCode }, token });
  } catch (err) { jsonError(res, 500, 'Erreur serveur'); }
}

async function handleMe(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const { data: profile } = await getSupabaseAdmin().from('profiles').select('*').eq('id', user.userId).maybeSingle();
    if (!profile) return jsonError(res, 404, 'Profil non trouvé');

    jsonResponse(res, 200, { user: { id: profile.id, email: profile.email, firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone, avatarUrl: profile.avatar_url, xp: profile.xp, level: profile.level, streak: profile.streak, badges: profile.badges, totalXp: profile.total_xp, isAdmin: profile.is_admin, referralCode: profile.referral_code, createdAt: profile.created_at } });
  } catch (err) { jsonError(res, 500, 'Erreur serveur'); }
}
