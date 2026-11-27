-- Art for Climate (Leuven 2030 · M Leuven) — Supabase PostgreSQL & Realtime schema
-- Voer dit script eenmalig uit in de Supabase SQL Editor.

-- 1. Beheerders-allowlist (enkel e-mailadressen in deze tabel krijgen schrijfrechten)
CREATE TABLE IF NOT EXISTS public.admin_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.admin_users (email)
VALUES ('thomas.deschuyteneer@leuven.be')
ON CONFLICT (email) DO NOTHING;

-- Helperfunctie om beheerdersrechten te controleren via JWT e-mail
CREATE OR REPLACE FUNCTION public.is_auction_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.admin_users a
      WHERE lower(a.email) = lower(auth.jwt() ->> 'email')
    ),
    false
  );
$$;

-- 2. Veilingstatus (singleton rij id = 'main')
CREATE TABLE IF NOT EXISTS public.auction_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  title TEXT NOT NULL DEFAULT 'Art for Climate',
  slogan TEXT NOT NULL DEFAULT 'Meer kunst, meer toekomst',
  organization TEXT NOT NULL DEFAULT 'Leuven 2030',
  location TEXT NOT NULL DEFAULT 'M Leuven, Leopold Vanderkelenstraat 28',
  event_date_label TEXT NOT NULL DEFAULT 'Woensdag 16 december 2026 · 16:00 uur',
  on_site_only BOOLEAN NOT NULL DEFAULT true,
  active_lot_id TEXT NOT NULL DEFAULT 'lot-10',
  hammer_stage TEXT NOT NULL DEFAULT 'open' CHECK (hammer_stage IN ('open', 'going_once', 'going_twice', 'hammer_down')),
  is_live_session_active BOOLEAN NOT NULL DEFAULT true,
  auction_closed BOOLEAN NOT NULL DEFAULT false,
  lot_duration_seconds INTEGER NOT NULL DEFAULT 180,
  lot_timer_ends_at TIMESTAMPTZ,
  lot_timer_remaining_seconds INTEGER NOT NULL DEFAULT 180,
  announcement TEXT NOT NULL DEFAULT '',
  catalog_pdf_name TEXT,
  floorplan_image_url TEXT,
  public_base_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.auction_state (
  id, title, slogan, organization, location, event_date_label,
  on_site_only, active_lot_id, hammer_stage, is_live_session_active,
  auction_closed, lot_duration_seconds, lot_timer_ends_at,
  lot_timer_remaining_seconds, announcement, catalog_pdf_name
)
VALUES (
  'main',
  'Art for Climate',
  'Meer kunst, meer toekomst',
  'Leuven 2030',
  'M Leuven, Leopold Vanderkelenstraat 28',
  'Woensdag 16 december 2026 · 16:00 uur',
  true,
  'lot-10',
  'open',
  true,
  false,
  180,
  NULL,
  180,
  'Welkom in M Leuven. Ontdek alle kunstwerken gemixed in Antichambre Deel 1 en 2, bewaar je favorieten en bied op 16 december live in het Forum ten voordele van het Leuvens Klimaatfonds.',
  'LEUVEN2030_catalogus_kunstveiling_v12.pdf'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Kunstwerken & loten
CREATE TABLE IF NOT EXISTS public.artworks (
  id TEXT PRIMARY KEY,
  lot_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL,
  artist_location TEXT NOT NULL DEFAULT 'Leuven / België',
  year TEXT NOT NULL DEFAULT '2026',
  category TEXT NOT NULL DEFAULT 'Beeldende kunst',
  medium TEXT NOT NULL DEFAULT '',
  dimensions TEXT NOT NULL DEFAULT '',
  gallery_room TEXT NOT NULL DEFAULT 'Antichambre Deel 1',
  plinth_code TEXT NOT NULL DEFAULT '',
  provenance TEXT NOT NULL DEFAULT '',
  climate_impact TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '/art-for-climate-banner.png',
  credit TEXT DEFAULT '',
  estimate_low INTEGER NOT NULL DEFAULT 500,
  estimate_high INTEGER NOT NULL DEFAULT 900,
  starting_bid INTEGER NOT NULL DEFAULT 500,
  current_bid INTEGER NOT NULL DEFAULT 0,
  highest_bidder_number TEXT,
  bid_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('upcoming', 'live', 'sold', 'passed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Zaalbiedingen (uitsluitend via veilingmeester/beheer in de zaal; online bieden geblokkeerd)
CREATE TABLE IF NOT EXISTS public.bids (
  id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  lot_number INTEGER NOT NULL,
  artwork_title TEXT NOT NULL DEFAULT '',
  bidder_number TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount <= 1000000),
  source TEXT NOT NULL DEFAULT 'floor' CHECK (source = 'floor'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Vertrouwelijke facturatiegegevens van bieders (enkel toegankelijk voor beheerder)
CREATE TABLE IF NOT EXISTS public.bidders (
  bidder_number TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  vat_number TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '3000',
  city TEXT NOT NULL DEFAULT 'Leuven',
  country TEXT NOT NULL DEFAULT 'België',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Organisatorinstellingen voor facturatie (enkel beheerder)
CREATE TABLE IF NOT EXISTS public.organizer_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  legal_name TEXT NOT NULL DEFAULT 'Leuven Klimaatneutraal 2030 vzw (Leuven 2030)',
  address_line TEXT NOT NULL DEFAULT 'Professor Van Overstraetenplein 1',
  postal_city TEXT NOT NULL DEFAULT '3000 Leuven',
  country TEXT NOT NULL DEFAULT 'België',
  vat_number TEXT NOT NULL DEFAULT 'BE 0544.963.123',
  court_district TEXT NOT NULL DEFAULT 'RPR Leuven',
  iban TEXT NOT NULL DEFAULT '',
  bic TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT 'info@leuven2030.be',
  vat_mode TEXT NOT NULL DEFAULT 'exempt_charity' CHECK (vat_mode IN ('exempt_charity', 'vat_6', 'vat_21')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.organizer_settings (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 7. Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bidders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_settings ENABLE ROW LEVEL SECURITY;

-- admin_users: ingelogde gebruiker mag enkel controleren of eigen e-mailadres beheerder is
DROP POLICY IF EXISTS "admin_users_self_select" ON public.admin_users;
CREATE POLICY "admin_users_self_select" ON public.admin_users
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- auction_state: publiek leesbaar, enkel beheerder mag wijzigen
DROP POLICY IF EXISTS "auction_state_public_read" ON public.auction_state;
CREATE POLICY "auction_state_public_read" ON public.auction_state
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "auction_state_admin_write" ON public.auction_state;
CREATE POLICY "auction_state_admin_write" ON public.auction_state
  FOR ALL TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

-- artworks: publiek leesbaar, enkel beheerder mag toevoegen/bewerken/verwijderen
DROP POLICY IF EXISTS "artworks_public_read" ON public.artworks;
CREATE POLICY "artworks_public_read" ON public.artworks
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "artworks_admin_write" ON public.artworks;
CREATE POLICY "artworks_admin_write" ON public.artworks
  FOR ALL TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

-- bids, bidders, organizer_settings: uitsluitend beheerder
DROP POLICY IF EXISTS "bids_admin_all" ON public.bids;
CREATE POLICY "bids_admin_all" ON public.bids
  FOR ALL TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

DROP POLICY IF EXISTS "bidders_admin_all" ON public.bidders;
CREATE POLICY "bidders_admin_all" ON public.bidders
  FOR ALL TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

DROP POLICY IF EXISTS "organizer_settings_admin_all" ON public.organizer_settings;
CREATE POLICY "organizer_settings_admin_all" ON public.organizer_settings
  FOR ALL TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

-- 8. Atomische RPC voor zaalbiedingen door de veilingmeester
CREATE OR REPLACE FUNCTION public.place_floor_bid(
  p_artwork_id TEXT,
  p_bidder_number TEXT,
  p_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.auction_state%ROWTYPE;
  v_lot public.artworks%ROWTYPE;
  v_bid public.bids%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_bid_id TEXT := 'bid-' || extract(epoch from v_now)::bigint || '-' || substr(md5(random()::text), 1, 6);
BEGIN
  IF NOT public.is_auction_admin() THEN
    RAISE EXCEPTION 'Enkel de aangemelde veilingmeester kan zaalbiedingen registreren.';
  END IF;

  SELECT * INTO v_state FROM public.auction_state WHERE id = 'main';
  IF v_state.auction_closed THEN
    RAISE EXCEPTION 'De veiling is afgesloten door de veilingmeester.';
  END IF;

  SELECT * INTO v_lot FROM public.artworks WHERE id = p_artwork_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kunstwerk niet gevonden.';
  END IF;

  IF v_lot.status <> 'live' THEN
    RAISE EXCEPTION 'Biedingen zijn gesloten voor Lot %.', v_lot.lot_number;
  END IF;

  IF p_amount IS NULL OR p_amount <= v_lot.current_bid OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Het bod moet strikt hoger zijn dan het huidige bod.';
  END IF;

  IF v_lot.bid_count = 0 AND p_amount < v_lot.starting_bid THEN
    RAISE EXCEPTION 'Het openingsbod bedraagt minstens %.', v_lot.starting_bid;
  END IF;

  INSERT INTO public.bidders (bidder_number, name, city, postal_code, country, registered_at)
  VALUES (p_bidder_number, 'Zaalbieder ' || p_bidder_number, 'Leuven', '3000', 'België', v_now)
  ON CONFLICT (bidder_number) DO NOTHING;

  INSERT INTO public.bids (id, artwork_id, lot_number, artwork_title, bidder_number, amount, source, created_at)
  VALUES (
    v_bid_id,
    v_lot.id,
    v_lot.lot_number,
    CASE WHEN v_lot.title <> '' THEN v_lot.title ELSE v_lot.artist END,
    p_bidder_number,
    p_amount,
    'floor',
    v_now
  )
  RETURNING * INTO v_bid;

  UPDATE public.artworks
  SET
    current_bid = p_amount,
    highest_bidder_number = p_bidder_number,
    bid_count = v_lot.bid_count + 1,
    updated_at = v_now
  WHERE id = v_lot.id
  RETURNING * INTO v_lot;

  RETURN jsonb_build_object(
    'bid', to_jsonb(v_bid),
    'artwork', to_jsonb(v_lot)
  );
END;
$$;

-- 9. Atomische RPC om veiling opnieuw in te stellen
CREATE OR REPLACE FUNCTION public.reset_auction_live()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_auction_admin() THEN
    RAISE EXCEPTION 'Beheerderstoegang vereist.';
  END IF;

  DELETE FROM public.bids;
  DELETE FROM public.bidders;

  UPDATE public.artworks
  SET
    current_bid = 0,
    highest_bidder_number = NULL,
    bid_count = 0,
    status = 'live',
    updated_at = now();

  UPDATE public.auction_state
  SET
    active_lot_id = 'lot-10',
    hammer_stage = 'open',
    is_live_session_active = true,
    auction_closed = false,
    lot_timer_ends_at = NULL,
    lot_timer_remaining_seconds = lot_duration_seconds,
    updated_at = now()
  WHERE id = 'main';
END;
$$;

-- 10. Officiële 45 kunstwerken (gemixed over Antichambre Deel 1 & Antichambre Deel 2)
INSERT INTO public.artworks (
  id, lot_number, title, artist, artist_location, year, category, medium,
  dimensions, gallery_room, plinth_code, provenance, climate_impact,
  description, image_url, credit, estimate_low, estimate_high, starting_bid,
  current_bid, highest_bidder_number, bid_count, status
)
VALUES
  ('lot-10', 10, '', 'Shalan Alhamwy', 'Leuven / België', '2026', 'Fotografie', 'fotografie', '40 x 30 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 10', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Zelfportret, nog met 2 oren.', '/catalog-images/lot-10.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-11', 11, 'AND THEN CAME FALL LIVE', 'And Then Came Fall', 'Leuven / België', '2026', 'Huiskamerconcert & Podium', 'huiskamerconcert', 'Op locatie naar keuze (voorwaarden in catalogus)', 'Antichambre Deel 2', 'Antichambre 2 · Positie 11', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'And Then Came Fall brengt een warme mix van indie-folk, pop en soul. Met de bezielde stem van Annelies Tanghe en de muzikale ondersteuning van Sam Pieter Janssens brengen ze songs die doen denken aan Carole King, Fleetwood Mac of Feist. Een intiem en tijdloos huiskamerconcert om bij weg te dromen.', '/catalog-images/lot-11.png', '© An Minnen', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-12', 12, 'STILLE AANWEZIGHEID', 'Rita Bellens', 'Leuven / België', '2026', 'Schilderkunst', 'olie op doek', '80 x 100 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 12', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Een warm en expressief interieur waarin bloemen, fruit en een lege stoel samen een verstild moment vormen. Met losse penseelstreken en warme kleuren roept Rita Bellens een sfeer op van huiselijkheid, rust en menselijke aanwezigheid.', '/catalog-images/lot-12.png', '© ritabellens.weebly.com', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-13', 13, 'TWO FRAGMENTS', 'Nele Bergmans', 'Leuven / België', '2026', 'Sculptuur & Object', 'glas, staal, ketting, aluminium, vijzen', '45 x 30 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 13', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Dit werk begeeft zich tussen tekening, collage en sculptuur. Een roestige stalen plaat vol vingerafdrukken vormt een donkere omarming voor twee delicate stukken glas die zweven voor deze reflecterende achtergrond. Natuurlijk licht brengt de subtiliteiten van de materialen naar boven.', '/catalog-images/lot-13.png', '@ Nele Bergmans', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-14', 14, 'BUGARI EXPRESS LIVE', 'Bugari Express', 'Leuven / België', '2026', 'Huiskamerconcert & Podium', 'huiskamerconcert', 'Op locatie naar keuze (voorwaarden in catalogus)', 'Antichambre Deel 1', 'Antichambre 1 · Positie 14', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Bugari Express voert je mee op een fabelachtige muzikale reis van de grimmige Balkan tot het hete Argentinië: melancholiek, weemoedig, passioneel en vreugdevol. Dit kwartet grasduint in de traditionele volksmuziek: bij de accordeon en viool voegden zich een klarinet en een contrabas met een gemeenschappelijke passie voor Joodse klezmers, Roma- en Balkan-melodieën en tango.', '/catalog-images/lot-14.png', '© Freddy Vandervelpen', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-15', 15, 'WELTINNENRAUM - GAZE', 'Lies Daenen', 'Leuven / België', '2026', 'Grafiek & Tekening', 'potlood en pigment op papier', '59 x 42 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 15', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'De reeks Weltinnenraum verwijst naar de wereld die je ziet als je je ogen sluit. Dit werk - Gaze - zoomt in op het oog dat zich sluit en net dan die andere wereld ontdekt. Intiem en tegelijk zo veel meer dan persoonlijk.', '/catalog-images/lot-15.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-16', 16, 'STARBROOK AIRPORT', 'Jaak De Koninck', 'Leuven / België', '2026', 'Schilderkunst', 'olieverf op paneel', '100 x 160 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 16', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Het is een lichtstraal op een grasveld het is aangenaam voor de ogen van de mens, schept rust ; ik wou dat ik er mijn klapstoel kon zetten.', '/catalog-images/lot-16.png', '© Jaak De Koninck', 1500, 2700, 1500, 0, NULL, 0, 'live'),
  ('lot-17', 17, 'GROWING ON THE EDGE', 'Maarten De Naeyer', 'Leuven / België', '2026', 'Schilderkunst', 'schilderij op doek', '50 x 40 x 2 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 17', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Dit werk, uitgevoerd met oliestick op doek, ontstond in aanloop naar mijn nieuwe solo-expo, waarin bloemen centraal staan. Vanuit florale vormen onderzoek ik kleur, ritme en abstractie, waarbij de bloem eerder een vertrekpunt dan een letterlijke voorstelling wordt.', '/catalog-images/lot-17.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-18', 18, 'DRINKBAK.', 'Janine Droste', 'Leuven / België', '2026', 'Schilderkunst', 'schilderij', '120 x 100 x 4 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 18', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Dit schilderij heeft een speelse, fantasierijke en bijna kinderlijke uitstraling. Het is opgebouwd uit heldere, contrasterende kleuren en eenvoudige vormen, waardoor het doet denken aan naïeve kunst of expressieve kinderillustraties.', '/catalog-images/lot-18.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-19', 19, 'NIGHTSWIMMING', 'Nathalie Duflos', 'Leuven / België', '2026', 'Schilderkunst', 'schilderij', '60 x 60 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 19', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Een kus onder water, ergens tussen droom en werkelijkheid. In de stilte van de nacht vinden twee mensen elkaar, omringd door blauw en dansend licht. Een ode aan de liefde, de verbondenheid en de kwetsbare schoonheid van onze wereld.', '/catalog-images/lot-19.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-20', 20, 'SONGS FOR THE PLANET', 'Floatstone/Brick de Bois', 'Leuven / België', '2026', 'Huiskamerconcert & Podium', 'huiskamerconcert', 'Op locatie naar keuze (voorwaarden in catalogus)', 'Antichambre Deel 1', 'Antichambre 1 · Positie 20', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Floatstone/Brick de Bois deelt zijn persoonlijke, poëtische, beklijvende, onversneden blik en emoties in een intiem huiskamerconcert. Een uur eigen songs over de planeet en erop leven en ons deel in alles. Hoor- en tastbaar in je huiskamer, om binnen te laten komen, daarna over na te praten, en na te denken.', '/catalog-images/lot-20.png', '© cyleong.be', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-21', 21, 'CABRA', 'Gerdi Fonk', 'Leuven / België', '2026', 'Sculptuur & Object', 'keramisch werk', '88 x 44 x 44 cm · 3 kg', 'Antichambre Deel 2', 'Antichambre 2 · Positie 21', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Dit werk, opgebouwd uit wilgentakken, papier maché en natuurlijke pigmenten, toont hoe levensvormen groeien uit de dynamiek van een landschap. Een steenbok verschijnt als een prehistorische gravure uit de krachtlijnen in een rotsblok.', '/catalog-images/lot-21.png', '© Gerdi Fonk', 1250, 2250, 1250, 0, NULL, 0, 'live'),
  ('lot-22', 22, 'NACHTREIZIGERS', 'Maarten Ghesquière', 'Leuven / België', '2026', 'Schilderkunst', 'olie op hardboard', '65 x 100 x 2 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 22', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Ik reis door de nacht, waar alles zijn vorm verliest. Een klein beetje licht onthult wat ik niet begrijp. We lopen verder, zonder te weten waarheen. Niet omdat we weten, maar omdat stilstaan geen optie is.', '/catalog-images/lot-22.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-23', 23, 'ERTS CYCLUS, THE LOVEBIKE', 'Tom Hermans', 'Leuven / België', '2026', 'Sculptuur & Object', 'handgemaakte fiets', '20 kg', 'Antichambre Deel 2', 'Antichambre 2 · Positie 23', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Follow your heart. Een hartvormige fiets. Met passie en vakmanschap maken we met de hand fietsen. Waarbij het materiaal ons de vrijheid biedt om in eender welke vorm te creëren. Lokaal vakmanschap van het hoogste niveau.', '/catalog-images/lot-23.png', '', 1000, 1800, 1000, 0, NULL, 0, 'live'),
  ('lot-24', 24, 'LEUVENSE WIJSHEID', 'Rita Heymans', 'Leuven / België', '2026', 'Fotografie', 'fotocompositie · beeldbewerking', '105 x 70 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 24', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Een gekende plek in Leuven gekoppeld aan boeken uit de bib haalden het beste eco-inzicht in me naarboven. Helaas volgt de werkelijkheid en de politiek maar schoorvoetend!', '/catalog-images/lot-24.png', '© www.art-unlimited.be', 595, 1071, 595, 0, NULL, 0, 'live'),
  ('lot-25', 25, 'HET GROTE WILDERBOEK — EEN VERBINDINGSLIJN TUSSEN KIND EN NATUUR', 'Rebecca Huys', 'Leuven / België', '2026', 'Grafiek & Tekening', 'geïllustreerd boek · creatief atelier', '25 stuks', 'Antichambre Deel 2', 'Antichambre 2 · Positie 25', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Met ’Het Grote Wilderboek’ (een handboek voor ouders en begeleiders) willen we jonge kinderen helpen ontdekken dat onze planeet magisch is. Het boek wordt samen met een creatief atelier ‘Reddende Hengeltjes’ aangeboden. De activiteiten en creatieve, kunstzinnige opdrachten maken deelnemers nieuwsgierig naar onze aarde en zijn talrijke bewoners.', '/catalog-images/lot-25.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-26', 26, 'ZWERM', 'Inspinazie / TIM Theater', 'Leuven / België', '2026', 'Huiskamerconcert & Podium', 'improvisatietheater', 'Op locatie naar keuze (voorwaarden in catalogus)', 'Antichambre Deel 1', 'Antichambre 1 · Positie 26', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Een improvisatietheatervoorstelling in twee delen: de buitenkant en de binnenkant. Beleef een volledig geïmproviseerde theatervoorstelling en leg nadien het vuur aan de schenen van de spelers - acteurs en muzikant. En neem zo een stukje improvisatiemagie mee naar huis.', '/catalog-images/lot-26.png', '© Jorik Breban', 1200, 2160, 1200, 0, NULL, 0, 'live'),
  ('lot-27', 27, 'BORED', 'Intvis', 'Leuven / België', '2026', 'Schilderkunst', 'schilderij op steigerdoek', '220 x 170 x 0,5 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 27', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Bored laat het kind toe om zich te vervelen, om het beu te zijn. Het kunstwerk is opgebouwd uit verschillende lagen stellingdoek waarvan de kleuren mengen dank zij de hoge transparantie. Stellingdoek staat voor renovatie van de waarden van de stad.', '/catalog-images/lot-27.png', '', 2500, 4500, 2500, 0, NULL, 0, 'live'),
  ('lot-28', 28, 'LA GAUFRE LIÉGEOISE', 'Bram Kerkhofs', 'Leuven / België', '2026', 'Sculptuur & Object', 'sculptuur in roestvrij staal', '2,7 x 11,5 x 16 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 28', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'La gaufre Liégeoise is een kaarsenhouder of onderzetter uit roestvrij staal. Het is een visuele vertaling van een Luikse wafel opgebouwd volgens een vierkantig grid. Voor de gelegenheid van Art for Climate is de wafel onderdeel van een unieke sculptuur.', '/catalog-images/lot-28.png', '© Bram Kerkhofs', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-29', 29, 'TOUT S’ENCHAÎNE', 'Ine Lammers', 'Leuven / België', '2026', 'Schilderkunst', 'olieverfschilderij op onbehandeld canvas, grafietpotlood, genaaide fragmenten', '50 x 70 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 29', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Tout s’enchaîne’ ontstond tijdens een kunstenaarsresidentie, geïnspireerd door de poëzie van het Franse platteland. De zoektocht naar schoonheid vertaalt zich in de puurheid van onbehandeld canvas en aaneengenaaide fragmenten, waarin herschikking en samenhang elkaar vinden.', '/catalog-images/lot-29.png', '© Ine Lammer', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-30', 30, 'TURE, TEXT I', 'Sarah Lauwers', 'Leuven / België', '2026', 'Sculptuur & Object', 'keramisch werk, glazuur en potlood', '17 x 12,5 x 0,7 cm · 370 gr', 'Antichambre Deel 1', 'Antichambre 1 · Positie 30', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'TURE, text I onderzoekt op een speelse manier de hiërarchie tussen de mens en zijn omgeving. Het werk bevraagt hoe onze manieren van leren, ontleden en betekenis geven tekort kunnen schieten om de eigenheid en autonomie van meer-dan-menselijk leven, zoals planten, te vatten.', '/catalog-images/lot-30.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-31', 31, '‘HAPPY STELLA’ & ‘HAPPY ARTOIS’', 'Esther Lekanne (Noozi art)', 'Leuven / België', '2026', 'Schilderkunst', 'schilderij · tweeluik', '81 x 61 & 81 x 81 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 31', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', '‘Happy Stella’ & ‘Happy Artois’ is een tweeluik gebaseerd op eerdere werken waarin toeschouwers worden uitgenodigd om even stil te staan en te zoeken naar verbinding met de afgebeelde personages en een gekende locatie in Leuven, in dit geval het Stella Artois gebouw aan de vaart. Ingekaderd in kaders van ± 2,5 cm.', '/catalog-images/lot-31.png', '', 800, 1440, 800, 0, NULL, 0, 'live'),
  ('lot-32', 32, 'PEOPLE. PURPOSE. PLANET.', 'Joke Mariën', 'Leuven / België', '2026', 'Fotografie', 'fotografie, kwaliteitsprint met passe-partout en lijst', '3 afzonderlijke ingelijste werken van 50 x 70 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 32', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Een fotografische reeks van drie beelden die inhoudelijk en visueel één geheel vormen. Elk beeld wordt uitgevoerd als kwaliteitsprint met passe-partout en lijst. De drie werken worden samen als één set geveild.', '/catalog-images/lot-32.png', '© Jo–Photography | Storytelling Photographe', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-33', 33, 'NEPAL OP EEN KRUISPUNT', 'Nick Meynen', 'Leuven / België', '2026', 'Fotografie', '12 fotografische werken op canvas', '40 x 60 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 33', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Twaalf beelden, één ondeelbaar verhaal. Nick Meynen toont Nepal op het kruispunt van politieke omwenteling en klimaatontwrichting. Wie deze collectie verwerft, bewaart een bijzonder tijdsdocument én steunt sociale klimaatactie in Leuven. Ontdek het verhaal via de QR-code.', '/catalog-images/lot-33.png', '© Nick Meynen', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-34', 34, '10 JAAR LATER', 'Gloria Monserez & Jan Hautekiet', 'Leuven / België', '2026', 'Huiskamerconcert & Podium', 'huiskamerconcert', 'Op locatie naar keuze (voorwaarden in catalogus)', 'Antichambre Deel 1', 'Antichambre 1 · Positie 34', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Huiskamerconcert van Gloria Monserez en Jan Hautekiet, 10 jaar nadat ze ter gelegenheid van 150 jaar Stadsschouwburg Leuven deelnamen aan het project 96 x Romeo & Julia.', '/catalog-images/lot-34.png', '', 1500, 2700, 1500, 0, NULL, 0, 'live'),
  ('lot-35', 35, 'ME', 'NK', 'Leuven / België', '2026', 'Schilderkunst', 'acryl op doek, canvas', '100 x 140 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 35', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'De mens is egoïstisch, een individu dat zichzelf steeds op de eerste plaats zet. Te vaak vergeten we te kijken naar anderen ... .', '/catalog-images/lot-35.png', '© instagram Nk_Koch', 1200, 2160, 1200, 0, NULL, 0, 'live'),
  ('lot-36', 36, 'W.O.P. #28/2026 (PLUIE DE DENTS)', 'Els Nouwen', 'Leuven / België', '2026', 'Schilderkunst', 'olieverf op papier', '29,7 x 21 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 36', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'W.O.P. #28/2026 maakt deel uit van een verzameling die ik toonde in M Leuven (OXOMORON, 29/01 tot 22/11/2026). Het werk op papier/print - meestal met olieverf - is experimenteel, intuïtief en spontaan. Binnen mijn praktijk speelt dit onderzoek naar beelden, ideeën en beeldtaal een wezenlijke rol.', '/catalog-images/lot-36.png', '© Kristel Van Ballaer', 1500, 2700, 1500, 0, NULL, 0, 'live'),
  ('lot-37', 37, 'ORIGINELE PAGINA GALAPAGOS', 'Michaël Olbrechts', 'Leuven / België', '2026', 'Grafiek & Tekening', 'potlood op papier', 'A4', 'Antichambre Deel 2', 'Antichambre 2 · Positie 37', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Originele pagina in potlood uit de graphic novel ‘Galapagos’ (Oogachtend, 2023), het vierde stripboek van Michaël Olbrechts, waarmee hij als eerste stripauteur ooit op de longlist stond van de Boon Literatuurprijs. Het boek gaat over een waargebeurd moordmysterie op het eiland Floreana in de Galapagos-archipel, waar enkele idealisten in de jaren 30 een utopisch leven wilden uitbouwen.', '/catalog-images/lot-37.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-38', 38, 'MUZIKALE ZALF', 'Orentroost', 'Leuven / België', '2026', 'Huiskamerconcert & Podium', 'huiskamerconcert', 'Op locatie naar keuze (voorwaarden in catalogus)', 'Antichambre Deel 1', 'Antichambre 1 · Positie 38', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'We brengen troostmuziek, instrumentaal en vocaal, als kwartet. We spelen meerdere instrumenten en traden ook al op voor Leuven Troost. We brengen een mix van stijlen op basis van afscheidsvieringen waarvoor mensen ons vragen. We kunnen dit ook mengen met teksten. Poëzie of proza.', '/catalog-images/lot-38.png', '© katleenvanderschrieck', 800, 1440, 800, 0, NULL, 0, 'live'),
  ('lot-39', 39, 'KANTELBOLETUS', 'Veerle Raskin', 'Leuven / België', '2026', 'Sculptuur & Object', 'keramisch werk', '27 x 40 x 32 cm · 15 kg', 'Antichambre Deel 2', 'Antichambre 2 · Positie 39', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Een boleet vormde de inspiratie voor dit werk. Kantelen, vallen en het zoeken naar balans staan centraal. De boleet helt naar één zijde, de plaatjes maken een tegenbeweging. Zo ontstaat een subtiel spel van ritme en beweging, van lichte kleuren en donkere diepte.', '/catalog-images/lot-39.png', '© Veerle Raskin', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-40', 40, '', 'Frank Ryckeboer', 'Leuven / België', '2026', 'Schilderkunst', 'inkt en acryl op papier', '56 x 76 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 40', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Brede, ritmische penseelstreken laten een menselijke gestalte ontstaan op de grens van figuratie en abstractie. Het donkere gebaar krijgt een tegenstem in de zachte grijstinten en het onbeschilderde papier. Zo ontstaat een spanning tussen lichamelijke kracht en kwetsbaarheid, tussen aanwezigheid en verdwijnen.', '/catalog-images/lot-40.png', '', 1100, 1980, 1100, 0, NULL, 0, 'live'),
  ('lot-41', 41, '', 'Frank Ryckeboer', 'Leuven / België', '2026', 'Schilderkunst', 'inkt en acryl op papier', '56 x 76 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 41', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'In krachtige, donkere penseelstreken verschijnt een gezicht dat zich nooit helemaal prijsgeeft. Transparante lagen en open plekken houden het beeld in beweging. Frank Ryckeboer laat herkenning en vervreemding samenvallen in een portret dat de blik vasthoudt, maar zijn verhaal openlaat.', '/catalog-images/lot-41.png', '', 1100, 1980, 1100, 0, NULL, 0, 'live'),
  ('lot-42', 42, 'MURMURATION', 'SoTTo voce xs', 'Leuven / België', '2026', 'Huiskamerconcert & Podium', 'huiskamerconcert', 'Op locatie naar keuze (voorwaarden in catalogus)', 'Antichambre Deel 1', 'Antichambre 1 · Positie 42', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'In de kleinst mogelijke bezetting met zang en luit brengt SoTTo voce xs polyfonie uit de renaissance en vroege barok. Goedele Vandommele (zang) en Stef Konings (luit) brengen een intiem programma met muziek van ondermeer John Dowland, Henry Purcell, Giulio Caccini en Josquin des Prez.', '/catalog-images/lot-42.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-43', 43, 'DE BRUID', 'Saskia Steeno', 'Leuven / België', '2026', 'Schilderkunst', 'mixed media op hout', '88,5 x 122,5 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 43', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'In De Bruid staat de precaire verhouding tussen mens en natuur centraal. Het werk verbeeldt de kwetsbare balans met de elementen. Een indringende visuele reflectie op onze plek in een veranderend klimaat.', '/catalog-images/lot-43.png', '© www.saskiasteeno.be', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-44', 44, 'CAIRN', 'Anke Tacq', 'Leuven / België', '2026', 'Sculptuur & Object', 'textieltechnieken met vilt', '20 x 15 x 15 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 44', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'De ‘cairn’ is voor mij een richtingaanwijzer naar balans: in jezelf, door empathie voor je eigen behoeften en kwetsbaarheden; in je afkomst, door patronen in het familiesysteem te verzoenen; en in de wereld, door onze plek te vinden als klein onderdeel van een groter geheel dat zorg verdient.', '/catalog-images/lot-44.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-45', 45, 'BIG WAVE', 'Hanne Tuytelaers', 'Leuven / België', '2026', 'Grafiek & Tekening', 'houtskooltekening op doek', '100 x 160 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 45', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Een brekende golf in houtskool op doek: de gladde, glanzende golfwand krult over in elegante, vloeiende lijnen, terwijl het schuim als rook opwaait. Het fijne detail in het wateroppervlak, het lichtgevend spel op de kam en de diepe zwarten tegen het zachte wit geven de beweging kracht en stilte tegelijk.', '/catalog-images/lot-45.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-46', 46, 'WAT VERDWIJNT / WAT TERUGKEERT (2026)', 'Mie-ke Vanbergen', 'Leuven / België', '2026', 'Schilderkunst', 'acrylverf op doek', '100 x 70 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 46', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'In het werk van Mie-ke lopen kunst, onderzoek en dagelijks leven vrolijk door elkaar. Ze maakt schilderijen en collages waarin materialen, ideeën en perspectieven samenkomen. Wat een warboel lijkt, worden speelse composities waarin ontmoeting, verbeelding en gelaagdheid richting geven.', '/catalog-images/lot-46.png', '', 1750, 3150, 1750, 0, NULL, 0, 'live'),
  ('lot-47', 47, 'UNDERNEATH', 'Johan Van Cutsem', 'Leuven / België', '2026', 'Fotografie', 'analoge fotografie, meervoudige belichting in de camera · kwaliteitsprint op dibond · houten kader met schaduwvoeg', '31,1 x 24,4 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 47', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Underneath gunt ons een blik in de toekomst. Het ijs op Groenland smelt; graniet en woestijn nemen het over. Dit is geen AI beeld maar een dubbel belicht negatief, de eerste keer in Groenland, een tweede keer in de woestijn van Mauritanië waar de verwoestijning dorpsgemeenschappen bedreigt.', '/catalog-images/lot-47.png', '© Johan Van Cutsem', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-48', 48, 'THE END OF FERTILITY / WHEN DICKHEADS RULE THE WORLD', 'Barbara Van Dael', 'Leuven / België', '2026', 'Sculptuur & Object', 'beeld en poëzie', '20 x 8 x 10 cm · 1 kg · A5', 'Antichambre Deel 1', 'Antichambre 1 · Positie 48', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Dit beeld is tot stand gekomen na de eerste presidentsverkiezing in USA van Donald Trump op 20 januari 2017. Sindsdien is dit beeld alleen maar relevanter geworden. Het beeld vormt een eenheid samen met het gedicht ''Big Bang Reversed''.', '/catalog-images/lot-48.png', '© Muireann Donnely | www.keramiekserai.com', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-49', 49, 'LICHENS NOTIFICATION II', 'Lise Van den Broucke', 'Leuven / België', '2026', 'Grafiek & Tekening', 'zeefdruk, reflecterende puff-inkt op bewerkte stenen en mineralen', '24 x 162 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 49', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Lichens Notification II onderzoekt korstmossen als verborgen communicatiesystemen en dragers van verhalen over de omgeving waarin ze leven. Reflecterende inkt laat beelden van korstmossen verschijnen en verdwijnen op stenen en mineralen, en vraagt zo aandacht voor een onzichtbaar traag groeiend leven.', '/catalog-images/lot-49.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-50', 50, 'ONZE NATUUR', 'Jan Vander Elst, keramiekatelier ‘t Rood Huys', 'Leuven / België', '2026', 'Sculptuur & Object', 'keramisch werk', '41 x 30 cm · 6 kg', 'Antichambre Deel 1', 'Antichambre 1 · Positie 50', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Drie keramische elementen zijn afzonderlijk gedraaid, afgewerkt en in de oven, door middel van de glazuren, tot een geheel versmolten. De drie elementen geven telkens een tafereel weer dat zich afspeelt in de natuur.', '/catalog-images/lot-50.png', '', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-51', 51, 'LES AMANTS', 'Yo Vandevenne', 'Leuven / België', '2026', 'Sculptuur & Object', 'keramisch werk', '32 x 30 x 8 cm · 5,1 kg', 'Antichambre Deel 2', 'Antichambre 2 · Positie 51', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'De kus | poëzie | Hedwig Dujardin In het voorvoelen dat net niet en toch de lippen al wakker ademt, in het tijdloos onderweg van hem naar haar naar hem, in het tasten op afstand in minder dan amper raken, in uitreiken naar elkaar, zwijgt hij zijn vraag stilt zij haar ja.', '/catalog-images/lot-51.png', '© Yo Vandevenne', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-52', 52, 'WOOD WORK / FLOWER DRAWING I', 'Lieselotte Vloeberghs', 'Leuven / België', '2026', 'Grafiek & Tekening', 'gebrande tekening op hout', '10 x 15 x 5 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 52', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Wood work / flower drawing I is de eerste uit een serie van drie tekeningen die in gevonden stukken hout zijn gesneden en ingebrand. De serie toont menselijke figuren in dialoog met bloemen.', '/catalog-images/lot-52.png', '© Lien Wevers', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-53', 53, 'LOVELY', 'Maggy Vught', 'Leuven / België', '2026', 'Schilderkunst', 'mixed media', '100 x 100 cm', 'Antichambre Deel 2', 'Antichambre 2 · Positie 53', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Voor mij zijn kleuren energie en vrolijke kleuren in abstracte bloemen daar zeggen mensen dikwijls van “dat maakt ons blij” en dan bereik ik mijn doel.', '/catalog-images/lot-53.png', '© maggyvught-art.be', 500, 900, 500, 0, NULL, 0, 'live'),
  ('lot-54', 54, 'PIER 56', 'Sien Winters', 'Leuven / België', '2026', 'Schilderkunst', 'olieverf op canvas', '70 x 50 x 2 cm', 'Antichambre Deel 1', 'Antichambre 1 · Positie 54', 'Geschonken voor Leuven 2030 — Art for Climate in M Leuven.', 'De opbrengst gaat naar het Leuvens Klimaatfonds om sociale organisaties te helpen hun gebouwen te isoleren en te verduurzamen.', 'Ooit waren de pieren de toegangspoort tot de stad en het hart van het sociale en culturele leven in New York. Het schilderij toont een vervallen pier, gezien vanaf de vernieuwde en levendige pier ernaast, voor mij symbool van hoe verleden en toekomst kunnen worden verweven tot een sterk geheel.', '/catalog-images/lot-54.png', '', 500, 900, 500, 0, NULL, 0, 'live')
ON CONFLICT (id) DO NOTHING;

-- 11. Supabase Realtime inschakelen voor live synchronisatie
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'artworks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.artworks;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'auction_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_state;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bids'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
  END IF;
END $$;
