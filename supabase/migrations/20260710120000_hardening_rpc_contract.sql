-- Skills DZ hardening: non-destructive schema/API contract fixes
-- This migration intentionally avoids DROP TABLE and can be applied to an existing project.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS days_per_week INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS hours_per_day INT DEFAULT 3;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS currency_rate NUMERIC;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_xp_non_negative CHECK (xp >= 0) NOT VALID,
  ADD CONSTRAINT profiles_total_xp_non_negative CHECK (total_xp >= 0) NOT VALID;

ALTER TABLE public.shop_items
  ADD CONSTRAINT shop_items_stock_valid CHECK (stock >= -1) NOT VALID,
  ADD CONSTRAINT shop_items_xp_cost_positive CHECK (xp_cost > 0) NOT VALID;

ALTER TABLE public.formations
  ADD CONSTRAINT formations_days_per_week_valid CHECK (days_per_week BETWEEN 0 AND 7) NOT VALID,
  ADD CONSTRAINT formations_hours_per_day_valid CHECK (hours_per_day BETWEEN 0 AND 24) NOT VALID;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_range CHECK (amount_dzd BETWEEN 500 AND 500000) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);

CREATE OR REPLACE FUNCTION public.calculate_level(p_xp INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_xp, 0) >= 5000 THEN 8
    WHEN COALESCE(p_xp, 0) >= 3500 THEN 7
    WHEN COALESCE(p_xp, 0) >= 2000 THEN 6
    WHEN COALESCE(p_xp, 0) >= 1000 THEN 5
    WHEN COALESCE(p_xp, 0) >= 500 THEN 4
    WHEN COALESCE(p_xp, 0) >= 250 THEN 3
    WHEN COALESCE(p_xp, 0) >= 100 THEN 2
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.increment_xp(user_id UUID, amount INT)
RETURNS TABLE(xp INT, level INT, total_xp INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF $2 <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  UPDATE public.profiles p
  SET xp = COALESCE(p.xp, 0) + $2,
      total_xp = COALESCE(p.total_xp, 0) + $2,
      level = public.calculate_level(COALESCE(p.xp, 0) + $2),
      updated_at = NOW()
  WHERE p.id = $1
  RETURNING p.xp, p.level, p.total_xp INTO xp, level, total_xp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_xp(user_id UUID, amount INT)
RETURNS TABLE(xp INT, level INT, total_xp INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF $2 <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  UPDATE public.profiles p
  SET xp = COALESCE(p.xp, 0) - $2,
      level = public.calculate_level(COALESCE(p.xp, 0) - $2),
      updated_at = NOW()
  WHERE p.id = $1 AND COALESCE(p.xp, 0) >= $2
  RETURNING p.xp, p.level, p.total_xp INTO xp, level, total_xp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient xp or profile not found';
  END IF;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_xp(p_user_id UUID, p_amount INT, p_reason TEXT, p_source TEXT)
RETURNS TABLE(xp INT, level INT, total_xp INT, transaction_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  SELECT i.xp, i.level, i.total_xp
  INTO xp, level, total_xp
  FROM public.increment_xp(p_user_id, p_amount) i;

  INSERT INTO public.xp_transactions(user_id, amount, reason, source)
  VALUES (p_user_id, p_amount, LEFT(COALESCE(p_reason, 'XP gagné'), 200), p_source)
  RETURNING id INTO transaction_id;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_item(p_user_id UUID, p_item_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, remaining_xp INT, purchase_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.shop_items%ROWTYPE;
  v_profile_xp INT;
  v_new_xp INT;
BEGIN
  SELECT COALESCE(p.xp, 0)
  INTO v_profile_xp
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  SELECT *
  INTO v_item
  FROM public.shop_items si
  WHERE si.id = p_item_id AND si.is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item not found';
  END IF;

  IF v_item.stock = 0 THEN
    RAISE EXCEPTION 'out of stock';
  END IF;

  IF v_profile_xp < v_item.xp_cost THEN
    RAISE EXCEPTION 'insufficient xp';
  END IF;

  IF v_item.stock > 0 THEN
    UPDATE public.shop_items
    SET stock = stock - 1
    WHERE id = p_item_id;
  END IF;

  v_new_xp := v_profile_xp - v_item.xp_cost;

  UPDATE public.profiles
  SET xp = v_new_xp,
      level = public.calculate_level(v_new_xp),
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.purchases(user_id, item_id, xp_spent, status)
  VALUES (p_user_id, p_item_id, v_item.xp_cost, 'pending')
  RETURNING id INTO purchase_id;

  INSERT INTO public.xp_transactions(user_id, amount, reason, source)
  VALUES (p_user_id, -v_item.xp_cost, LEFT('Achat: ' || v_item.name, 200), 'shop');

  success := TRUE;
  message := 'Achat enregistré';
  remaining_xp := v_new_xp;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_formation(p_user_id UUID, p_formation_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, xp_awarded INT, current_xp INT, current_level INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_formation public.formations%ROWTYPE;
  v_count INT;
BEGIN
  SELECT *
  INTO v_formation
  FROM public.formations f
  WHERE f.id = p_formation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'formation not found';
  END IF;

  IF v_formation.status = 'full' THEN
    RAISE EXCEPTION 'formation full';
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM public.user_formations uf
  WHERE uf.formation_id = p_formation_id;

  IF COALESCE(v_formation.max_slots, 0) > 0 AND v_count >= v_formation.max_slots THEN
    UPDATE public.formations SET status = 'full' WHERE id = p_formation_id;
    RAISE EXCEPTION 'formation full';
  END IF;

  INSERT INTO public.user_formations(user_id, formation_id)
  VALUES (p_user_id, p_formation_id)
  ON CONFLICT (user_id, formation_id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'already enrolled';
  END IF;

  xp_awarded := COALESCE(v_formation.xp_reward, 0);

  IF xp_awarded > 0 THEN
    SELECT ax.xp, ax.level
    INTO current_xp, current_level
    FROM public.award_xp(p_user_id, xp_awarded, 'Inscription: ' || v_formation.title, 'course') ax;
  ELSE
    SELECT p.xp, p.level INTO current_xp, current_level FROM public.profiles p WHERE p.id = p_user_id;
  END IF;

  success := TRUE;
  message := 'Inscription réussie';
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_level(INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_xp(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_xp(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_xp(UUID, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_item(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.enroll_formation(UUID, UUID) TO service_role;

UPDATE public.profiles
SET level = public.calculate_level(xp)
WHERE level IS DISTINCT FROM public.calculate_level(xp);
