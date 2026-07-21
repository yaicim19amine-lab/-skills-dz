ALTER TABLE formations ADD COLUMN IF NOT EXISTS promo_price_dzd integer;

INSERT INTO formations (title, description, duration_weeks, price_dzd, promo_price_dzd, max_slots, xp_reward, emoji, level_required, status, days_per_week, hours_per_day)
VALUES
  ('Gestion de stock',
   'Maîtrisez l''organisation des stocks, le suivi des entrées et sorties, et les inventaires.',
   4, 25000, 15000, 20, 500, '📦', 1, 'active', 3, 3),
  ('Déclarant en douane',
   'Comprenez les bases des opérations douanières, l''import-export, les formalités et le traitement des dossiers.',
   1, 45000, 30000, 20, 600, '🚢', 1, 'active', 5, 4),
  ('Pack Tourisme & Hôtellerie + Agent de voyage',
   'Deux formations pour construire votre avenir dans le tourisme, avec apprentissage du logiciel Amadeus.',
   12, 45000, 30000, 20, 900, '✈️', 1, 'active', 1, 3),
  ('Formation HSE',
   'Hygiène, Sécurité et Environnement. Préparez-vous aux métiers d''Agent HSE, Inspecteur HSE et Superviseur HSE.',
   1, 35000, null, 20, 650, '🦺', 1, 'active', 5, 4),
  ('Pack Paramédical',
   '5 formations + 1 gratuite pour vous préparer aux métiers du secteur paramédical.',
   12, 15000, null, 20, 750, '🩺', 1, 'active', 1, 3);
