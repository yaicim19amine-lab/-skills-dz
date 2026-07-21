CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  formation_slug TEXT NOT NULL,
  formation_name TEXT NOT NULL,
  student_email TEXT,
  created_by UUID REFERENCES profiles(id),
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all codes" ON access_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE)
  );

CREATE POLICY "Users can read their own used codes" ON access_codes
  FOR SELECT USING (
    used_by = auth.uid() OR student_email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can validate codes" ON access_codes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
  );

CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_formation ON access_codes(formation_slug);
CREATE INDEX idx_access_codes_student ON access_codes(student_email);
