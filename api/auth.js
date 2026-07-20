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

function parseBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const ip = getClientIp(req);
  const rl = rateLimit(`auth:${ip}`, { windowMs: 60000, max: 15 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', rl.retryAfter);
    return jsonError(res, 429, `Trop de tentatives. Réessayez dans ${rl.retryAfter}s`);
  }

  try {
    if (req.method === 'POST') req.body = await parseBody(req);

    const url = new URL(req.url, `https://${req.headers.host}`);
    const action = url.searchParams.get('action');

    if (req.method === 'POST' && action === 'signup') return handleSignup(req, res);
    if (req.method === 'POST' && action === 'login') return handleLogin(req, res);
    if (req.method === 'POST' && action === 'google') return handleGoogle(req, res);
    if (req.method === 'POST' && action === 'facebook') return handleFacebook(req, res);
    if (req.method === 'POST' && action === 'forgot-password') return handleForgotPassword(req, res);
    if (req.method === 'GET' && action === 'me') return handleMe(req, res);

    return jsonError(res, 405, 'Route non trouvée');
  } catch (err) { console.error('[auth] handler error:', err); jsonError(res, 500, 'Erreur serveur'); }
}

async function handleSignup(req, res) {
  try {
    const { email, password, firstName } = req.body;
    if (!email || !password) return jsonError(res, 400, 'Email et mot de passe requis');
    if (!validateEmail(email)) return jsonError(res, 400, 'Format email invalide');
    const pwdError = validatePassword(password);
    if (pwdError) return jsonError(res, 400, pwdError);

    const supabase = getSupabaseAdmin();
    const { data: adminProfile } = await supabase.from('profiles').select('settings').eq('role', 'admin').limit(1).maybeSingle();
    const settings = adminProfile?.settings || {};
    if (settings.platform_registration_open === false) {
      return jsonError(res, 403, 'Les inscriptions sont temporairement fermées');
    }

    const cleanFirstName = sanitizeText(firstName || email.split('@')[0], 100);
    if (!cleanFirstName) return jsonError(res, 400, 'Prénom invalide');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) {
      if (authError.message.includes('already registered')) return jsonError(res, 409, 'Email déjà utilisé');
      console.error('Signup error:', authError.message);
      return jsonError(res, 500, 'Erreur lors de la création du compte');
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId, full_name: cleanFirstName, role: 'assistant',
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
      console.error('Profile error:', profileError.message);
      return jsonError(res, 500, 'Erreur lors de la création du profil');
    }

    const token = signToken({ userId, email });
    jsonResponse(res, 201, { user: { id: userId, email, firstName: cleanFirstName, xp: 0, level: 1, badges: [] }, token });
  } catch (err) { console.error('Signup error:', err.message, err.stack); jsonError(res, 500, 'Erreur serveur'); }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return jsonError(res, 400, 'Email et mot de passe requis');
    if (!validateEmail(email)) return jsonError(res, 400, 'Format email invalide');

    const supabase = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return jsonError(res, 401, 'Email ou mot de passe incorrect');

    const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', authData.user.id).maybeSingle();
    if (!profile) return jsonError(res, 404, 'Profil non trouvé');

    const token = signToken({ userId: authData.user.id, email });
    jsonResponse(res, 200, { user: { id: authData.user.id, email, firstName: profile.full_name || email.split('@')[0], xp: 0, level: 1, badges: [] }, token });
  } catch (err) { console.error('[auth] login error:', err.message); jsonError(res, 500, 'Erreur serveur'); }
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
  } catch (err) { console.error('ForgotPassword error:', err.message, err.stack); jsonError(res, 500, 'Erreur serveur'); }
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

    const { data: existing } = await supabase.from('profiles').select('id, email, first_name, last_name, xp, level, streak, badges, referral_code').eq('email', email).maybeSingle();
    if (existing) {
      const token = signToken({ userId: existing.id, email });
      return jsonResponse(res, 200, { user: { id: existing.id, email: existing.email, firstName: existing.first_name, lastName: existing.last_name, xp: existing.xp, level: existing.level, streak: existing.streak, badges: existing.badges, referralCode: existing.referral_code }, token });
    }

    const randomPassword = generateSecurePassword();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password: randomPassword, email_confirm: true });
    if (authError) { console.error('Google signup error:', authError.message); return jsonError(res, 500, 'Erreur création compte'); }

    const userReferralCode = await generateReferralCode(supabase, firstName);
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id, email, first_name: firstName, last_name: lastName, avatar_url: avatar,
      xp: 100, level: 2, streak: 0, badges: ['newcomer'], total_xp: 100, referral_code: userReferralCode,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      console.error('Google profile error:', profileError.message);
      return jsonError(res, 500, 'Erreur profil');
    }

    await supabase.from('xp_transactions').insert({ user_id: authData.user.id, amount: 100, reason: 'Bienvenue sur Skills DZ !', source: 'bonus' });

    const token = signToken({ userId: authData.user.id, email });
    jsonResponse(res, 201, { user: { id: authData.user.id, email, firstName, lastName, xp: 100, level: 2, streak: 0, badges: ['newcomer'], isAdmin: false, referralCode: userReferralCode }, token });
  } catch (err) { console.error('Google error:', err.message, err.stack); jsonError(res, 500, 'Erreur serveur'); }
}

async function handleFacebook(req, res) {
  try {
    const { firstName, lastName, email, accessToken } = req.body;
    if (!email) return jsonError(res, 400, 'Email requis');
    if (!accessToken) return jsonError(res, 400, 'Token Facebook requis');

    // Verify token with Facebook Graph API
    let fbEmail = email, fbFirstName = firstName, fbLastName = lastName;
    try {
      const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${accessToken}`);
      const fbProfile = await fbRes.json();
      if (fbProfile.error) return jsonError(res, 401, 'Token Facebook invalide');
      fbEmail = fbProfile.email || email;
      fbFirstName = fbProfile.first_name || firstName;
      fbLastName = fbProfile.last_name || lastName;
    } catch {
      return jsonError(res, 401, 'Erreur vérification Facebook');
    }

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase.from('profiles').select('id, email, first_name, last_name, xp, level, streak, badges, referral_code').eq('email', fbEmail).maybeSingle();
    if (existing) {
      const token = signToken({ userId: existing.id, email: fbEmail });
      return jsonResponse(res, 200, { user: { id: existing.id, email: existing.email, firstName: existing.first_name, lastName: existing.last_name, xp: existing.xp, level: existing.level, streak: existing.streak, badges: existing.badges, referralCode: existing.referral_code }, token });
    }

    const randomPassword = generateSecurePassword();
    const cleanFirstName = sanitizeText(firstName || email.split('@')[0], 100);
    const cleanLastName = sanitizeText(lastName || '', 100);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password: randomPassword, email_confirm: true });
    if (authError) return jsonError(res, 500, 'Erreur création compte');

    const userReferralCode = await generateReferralCode(supabase, cleanFirstName);
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id, email, first_name: cleanFirstName, last_name: cleanLastName,
      xp: 100, level: 2, streak: 0, badges: ['newcomer'], total_xp: 100, referral_code: userReferralCode,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return jsonError(res, 500, 'Erreur profil');
    }

    await supabase.from('xp_transactions').insert({ user_id: authData.user.id, amount: 100, reason: 'Bienvenue sur Skills DZ !', source: 'bonus' });

    const token = signToken({ userId: authData.user.id, email });
    jsonResponse(res, 201, { user: { id: authData.user.id, email, firstName: cleanFirstName, lastName: cleanLastName, xp: 100, level: 2, streak: 0, badges: ['newcomer'], isAdmin: false, referralCode: userReferralCode }, token });
  } catch (err) { console.error('Facebook error:', err.message, err.stack); jsonError(res, 500, 'Erreur serveur'); }
}

async function handleMe(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError(res, 401, 'Non autorisé');

  try {
    const { data: profile } = await getSupabaseAdmin().from('profiles').select('id, full_name, role, created_at').eq('id', user.userId).maybeSingle();
    if (!profile) return jsonError(res, 404, 'Profil non trouvé');

    jsonResponse(res, 200, { user: { id: profile.id, email: user.email, firstName: profile.full_name || user.email?.split('@')[0], role: profile.role, createdAt: profile.created_at } });
  } catch (err) { console.error('Me error:', err.message, err.stack); jsonError(res, 500, 'Erreur serveur'); }
}
