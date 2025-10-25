-- Dashboard Persistence Schema
-- Stores user dashboard configurations and widget settings

-- Table for dashboard configurations
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  theme JSONB DEFAULT '{}',
  layout JSONB DEFAULT '{"cols": 12, "rowHeight": 100, "compactType": "vertical"}',
  auto_refresh BOOLEAN DEFAULT false,
  refresh_interval INTEGER DEFAULT 60000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for dashboard widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboard_configs(id) ON DELETE CASCADE,
  widget_config JSONB NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_is_default ON dashboard_configs(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);

-- RLS Policies for dashboard_configs
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Users can view their own dashboards
CREATE POLICY "Users can view their own dashboards"
  ON dashboard_configs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own dashboards
CREATE POLICY "Users can create their own dashboards"
  ON dashboard_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own dashboards
CREATE POLICY "Users can update their own dashboards"
  ON dashboard_configs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own dashboards
CREATE POLICY "Users can delete their own dashboards"
  ON dashboard_configs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for dashboard_widgets
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Users can view widgets from their dashboards
CREATE POLICY "Users can view widgets from their dashboards"
  ON dashboard_widgets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_configs
      WHERE dashboard_configs.id = dashboard_widgets.dashboard_id
      AND dashboard_configs.user_id = auth.uid()
    )
  );

-- Users can create widgets for their dashboards
CREATE POLICY "Users can create widgets for their dashboards"
  ON dashboard_widgets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dashboard_configs
      WHERE dashboard_configs.id = dashboard_widgets.dashboard_id
      AND dashboard_configs.user_id = auth.uid()
    )
  );

-- Users can update widgets in their dashboards
CREATE POLICY "Users can update widgets in their dashboards"
  ON dashboard_widgets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_configs
      WHERE dashboard_configs.id = dashboard_widgets.dashboard_id
      AND dashboard_configs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dashboard_configs
      WHERE dashboard_configs.id = dashboard_widgets.dashboard_id
      AND dashboard_configs.user_id = auth.uid()
    )
  );

-- Users can delete widgets from their dashboards
CREATE POLICY "Users can delete widgets from their dashboards"
  ON dashboard_widgets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_configs
      WHERE dashboard_configs.id = dashboard_widgets.dashboard_id
      AND dashboard_configs.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_dashboard_configs_updated_at
  BEFORE UPDATE ON dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_updated_at();

-- Function to ensure only one default dashboard per user
CREATE OR REPLACE FUNCTION ensure_single_default_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other dashboards for this user to not default
    UPDATE dashboard_configs
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single default dashboard
CREATE TRIGGER ensure_single_default_dashboard_trigger
  BEFORE INSERT OR UPDATE ON dashboard_configs
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_dashboard();
