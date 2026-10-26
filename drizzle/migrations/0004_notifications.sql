CREATE TABLE public.notification_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_enabled boolean NOT NULL DEFAULT false,
  daily_times text[] NOT NULL DEFAULT '{20:00}',
  daily_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  daily_only_if_open boolean NOT NULL DEFAULT true,
  review_enabled boolean NOT NULL DEFAULT false,
  review_day smallint NOT NULL DEFAULT 7,
  review_time text NOT NULL DEFAULT '18:00',
  review_only_if_open boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ns_times CHECK (cardinality(daily_times) BETWEEN 1 AND 4),
  CONSTRAINT ns_review_day CHECK (review_day BETWEEN 1 AND 7),
  CONSTRAINT ns_review_time CHECK (review_time ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$')
);
GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ns read" ON public.notification_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ns insert" ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ns update" ON public.notification_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_notification_settings() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t text; d smallint;
BEGIN
  FOREACH t IN ARRAY NEW.daily_times LOOP
    IF t !~ '^([01][0-9]|2[0-3]):(00|15|30|45)$' THEN RAISE EXCEPTION 'Invalid reminder time %', t; END IF;
  END LOOP;
  FOREACH d IN ARRAY NEW.daily_days LOOP
    IF d < 1 OR d > 7 THEN RAISE EXCEPTION 'Invalid weekday %', d; END IF;
  END LOOP;
  NEW.user_id := COALESCE(OLD.user_id, NEW.user_id);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER notification_settings_validate BEFORE INSERT OR UPDATE ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_notification_settings();

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(endpoint) < 1000),
  p256dh text NOT NULL CHECK (length(p256dh) < 200),
  auth text NOT NULL CHECK (length(auth) < 100),
  device_label text NOT NULL DEFAULT '' CHECK (length(device_label) <= 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs read" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notification_sends (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot_key)
);
GRANT ALL ON public.notification_sends TO service_role;
ALTER TABLE public.notification_sends ENABLE ROW LEVEL SECURITY;