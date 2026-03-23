-- ============================================
-- Sanatorio Argentino — Transcriptor Hub Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Organizations (companies/teams)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Mi Empresa',
  plan TEXT NOT NULL DEFAULT 'starter',
  audio_minutes_limit INT NOT NULL DEFAULT 300,
  audio_minutes_used FLOAT NOT NULL DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organization members (link users to orgs)
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Meetings
CREATE TABLE IF NOT EXISTS public.meetings (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id),
  title TEXT NOT NULL DEFAULT 'Reunión sin título',
  transcription TEXT NOT NULL,
  analysis TEXT NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'resumen-general',
  presentation_data JSONB,
  concept_map JSONB,
  objectives JSONB DEFAULT '[]'::jsonb,
  duration_seconds FLOAT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON public.meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_analysis_type ON public.meetings(analysis_type);
CREATE INDEX IF NOT EXISTS idx_meetings_org_id ON public.meetings(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Policies (open for now, tighten later with auth)
CREATE POLICY "Allow all on organizations" ON public.organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on org_members" ON public.org_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on meetings" ON public.meetings FOR ALL USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.organizations IS 'Customer organizations with subscription plans';
COMMENT ON TABLE public.org_members IS 'Links Supabase auth users to organizations';
COMMENT ON COLUMN public.organizations.plan IS 'starter, pro, enterprise';
COMMENT ON COLUMN public.organizations.audio_minutes_limit IS 'Monthly audio minutes included in plan';
COMMENT ON COLUMN public.organizations.audio_minutes_used IS 'Audio minutes consumed this billing cycle';
