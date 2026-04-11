-- ============================================================
--  STYLESYNC — Schéma SQL complet (Supabase / PostgreSQL)
--  Version 1.0 — Avril 2026
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- recherche full-text

-- ============================================================
-- 1. UTILISATEURS & PROFILS
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,

  -- Préférences de style
  style_persona TEXT CHECK (style_persona IN ('minimal','streetwear','corporate','boheme','casual','sport')),
  gender        TEXT CHECK (gender IN ('homme','femme','non-binaire','non-renseigné')) DEFAULT 'non-renseigné',

  -- Préférences couleurs (tableau de couleurs détestées)
  disliked_colors TEXT[] DEFAULT '{}',

  -- Sensibilité thermique (-2 frileux → +2 chaud)
  thermal_sensitivity SMALLINT DEFAULT 0 CHECK (thermal_sensitivity BETWEEN -2 AND 2),

  -- Localisation pour météo (ville par défaut)
  default_city  TEXT,
  default_lat   NUMERIC(9,6),
  default_lng   NUMERIC(9,6),

  -- RGPD
  calendar_sync_enabled BOOLEAN DEFAULT FALSE,
  location_enabled      BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT TRUE,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. VÊTEMENTS (GARMENTS)
-- ============================================================

CREATE TABLE public.garments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Images
  image_url         TEXT NOT NULL,         -- URL Supabase Storage (avec fond)
  image_url_clean   TEXT,                  -- URL après détourage IA

  -- Classification principale
  category      TEXT NOT NULL CHECK (category IN (
    'haut','bas','robe','combinaison','sur-vetement',
    'chaussures','accessoire','sous-vetement','sport'
  )),
  subcategory   TEXT,    -- ex: 'jean', 'col-roule', 'trench', 'derby'
  label         TEXT,    -- Nom donné par l'utilisateur ex: "Mon trench beige"

  -- Attributs visuels (générés par IA + correction manuelle)
  color_primary   TEXT,         -- ex: 'camel', 'blanc', 'marine'
  color_hex       CHAR(7),      -- ex: '#C8A97A'
  color_secondary TEXT,
  pattern         TEXT CHECK (pattern IN ('uni','rayures','carreaux','fleurs','imprime','autre')),
  material        TEXT,         -- ex: 'coton', 'laine', 'cuir'

  -- Contexte d'usage
  formality       SMALLINT DEFAULT 2 CHECK (formality BETWEEN 1 AND 5),
  -- 1=très casual, 2=casual, 3=smart casual, 4=business, 5=formel

  seasons         TEXT[] DEFAULT '{printemps,ete,automne,hiver}',
  -- Sous-ensemble de : printemps, ete, automne, hiver

  -- Température min/max recommandée (°C)
  temp_min        SMALLINT DEFAULT -10,
  temp_max        SMALLINT DEFAULT 35,

  -- État & suivi
  is_active       BOOLEAN DEFAULT TRUE,  -- FALSE = corbeille/donné
  donated_at      TIMESTAMPTZ,
  last_worn_at    TIMESTAMPTZ,
  wear_count      INTEGER DEFAULT 0,

  -- Tags libres utilisateur
  tags            TEXT[] DEFAULT '{}',

  -- Métadonnées IA
  ai_confidence   NUMERIC(4,3),          -- score de confiance du tagging IA (0.0–1.0)
  ai_raw_response JSONB,                 -- réponse brute de l'API vision

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_garments_updated_at
  BEFORE UPDATE ON public.garments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index de performance
CREATE INDEX idx_garments_user_id    ON public.garments(user_id);
CREATE INDEX idx_garments_category   ON public.garments(category);
CREATE INDEX idx_garments_active     ON public.garments(user_id, is_active);
CREATE INDEX idx_garments_last_worn  ON public.garments(user_id, last_worn_at);
CREATE INDEX idx_garments_tags       ON public.garments USING GIN(tags);
CREATE INDEX idx_garments_seasons    ON public.garments USING GIN(seasons);

-- ============================================================
-- 3. TENUES (OUTFITS)
-- ============================================================

CREATE TABLE public.outfits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Contexte de génération
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  weather_temp    NUMERIC(4,1),        -- température réelle au moment de la génération
  weather_desc    TEXT,                -- ex: 'nuageux', 'ensoleillé'
  weather_rain    BOOLEAN DEFAULT FALSE,
  calendar_event  TEXT,               -- label de l'événement agenda, ex: 'Réunion client'

  -- Type de suggestion
  suggestion_type TEXT CHECK (suggestion_type IN ('ia','confort','audacieux')),
  match_score     NUMERIC(4,1),       -- score de pertinence 0–100

  -- Statut
  status          TEXT DEFAULT 'suggested' CHECK (status IN ('suggested','worn','skipped','shuffled')),
  worn_at         DATE,               -- date à laquelle portée

  -- Feedback utilisateur
  user_rating     SMALLINT CHECK (user_rating BETWEEN 1 AND 5),

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outfits_user_id   ON public.outfits(user_id);
CREATE INDEX idx_outfits_worn_at   ON public.outfits(user_id, worn_at);
CREATE INDEX idx_outfits_status    ON public.outfits(user_id, status);

-- ============================================================
-- 4. PIÈCES D'UNE TENUE (relation many-to-many outfits ↔ garments)
-- ============================================================

CREATE TABLE public.outfit_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outfit_id   UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  garment_id  UUID NOT NULL REFERENCES public.garments(id) ON DELETE CASCADE,
  slot        TEXT NOT NULL CHECK (slot IN ('haut','bas','chaussures','sur-vetement','accessoire')),
  UNIQUE (outfit_id, slot)
);

CREATE INDEX idx_outfit_items_outfit   ON public.outfit_items(outfit_id);
CREATE INDEX idx_outfit_items_garment  ON public.outfit_items(garment_id);

-- ============================================================
-- 5. HISTORIQUE DE PORT (WEAR HISTORY)
-- ============================================================

CREATE TABLE public.wear_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outfit_id   UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
  worn_on     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wear_history_user    ON public.wear_history(user_id);
CREATE INDEX idx_wear_history_date    ON public.wear_history(user_id, worn_on DESC);

-- Mise à jour automatique de last_worn_at et wear_count sur chaque vêtement
CREATE OR REPLACE FUNCTION update_garment_wear_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.garments g
  SET
    last_worn_at = NOW(),
    wear_count   = wear_count + 1
  FROM public.outfit_items oi
  WHERE oi.outfit_id = NEW.outfit_id
    AND oi.garment_id = g.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_garment_stats
  AFTER INSERT ON public.wear_history
  FOR EACH ROW EXECUTE FUNCTION update_garment_wear_stats();

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wear_history ENABLE ROW LEVEL SECURITY;

-- Profiles : chaque utilisateur voit et modifie uniquement son profil
CREATE POLICY "profiles_self" ON public.profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Garments
CREATE POLICY "garments_owner" ON public.garments
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Outfits
CREATE POLICY "outfits_owner" ON public.outfits
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Outfit items (accès via outfit owner)
CREATE POLICY "outfit_items_owner" ON public.outfit_items
  USING (
    EXISTS (
      SELECT 1 FROM public.outfits o
      WHERE o.id = outfit_id AND o.user_id = auth.uid()
    )
  );

-- Wear history
CREATE POLICY "wear_history_owner" ON public.wear_history
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 7. VUES UTILES
-- ============================================================

-- Statistiques du dressing par utilisateur
CREATE VIEW public.wardrobe_stats AS
SELECT
  g.user_id,
  COUNT(*) FILTER (WHERE g.is_active)                        AS total_active,
  COUNT(*) FILTER (WHERE NOT g.is_active)                    AS total_donated,
  COUNT(*) FILTER (WHERE g.last_worn_at < NOW() - INTERVAL '1 year' AND g.is_active) AS to_donate,
  COUNT(*) FILTER (WHERE g.wear_count = 0 AND g.is_active)  AS never_worn,
  ROUND(AVG(g.wear_count) FILTER (WHERE g.is_active), 1)    AS avg_wear_count,
  MAX(g.created_at)                                          AS last_garment_added
FROM public.garments g
GROUP BY g.user_id;

-- Vêtements portés dans les 48h (pour l'algorithme anti-répétition)
CREATE VIEW public.recently_worn_garments AS
SELECT DISTINCT oi.garment_id, wh.user_id, wh.worn_on
FROM public.wear_history wh
JOIN public.outfits o      ON o.id = wh.outfit_id
JOIN public.outfit_items oi ON oi.outfit_id = o.id
WHERE wh.worn_on >= CURRENT_DATE - INTERVAL '2 days';
