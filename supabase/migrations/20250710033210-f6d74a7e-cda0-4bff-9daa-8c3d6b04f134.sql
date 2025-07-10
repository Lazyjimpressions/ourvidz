-- Progress tracking for admin portal development
CREATE TABLE admin_development_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(100) NOT NULL,
    feature_category VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),
    assigned_to VARCHAR(100),
    estimated_hours INTEGER,
    actual_hours INTEGER,
    start_date DATE,
    completion_date DATE,
    notes TEXT,
    blockers TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature testing results for prompt optimization
CREATE TABLE prompt_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_text TEXT NOT NULL,
    model_type VARCHAR(20) NOT NULL CHECK (model_type IN ('SDXL', 'WAN')),
    prompt_category VARCHAR(50),
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    generation_time_ms INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    notes TEXT,
    tested_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model performance tracking
CREATE TABLE model_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type VARCHAR(20) NOT NULL CHECK (model_type IN ('SDXL', 'WAN')),
    date DATE NOT NULL,
    total_generations INTEGER DEFAULT 0,
    successful_generations INTEGER DEFAULT 0,
    failed_generations INTEGER DEFAULT 0,
    avg_generation_time_ms INTEGER,
    avg_quality_rating DECIMAL(3,2),
    total_processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(model_type, date)
);

-- Model configuration history
CREATE TABLE model_config_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type VARCHAR(20) NOT NULL CHECK (model_type IN ('SDXL', 'WAN')),
    config_name VARCHAR(100) NOT NULL,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Insert initial progress tracking data
INSERT INTO admin_development_progress (feature_name, feature_category, status, priority, estimated_hours, notes) VALUES
('Prompt Testing Interface', 'Core Features', 'not_started', 'P0', 16, 'Batch prompt submission and quality rating system'),
('Model Analytics Dashboard', 'Core Features', 'not_started', 'P0', 12, 'Performance tracking and trend analysis'),
('Enhanced Job Management', 'Core Features', 'not_started', 'P1', 8, 'Model-specific filtering and bulk operations'),
('Model Configuration Panel', 'Core Features', 'not_started', 'P1', 6, 'Parameter adjustment and configuration management'),
('Database Schema Setup', 'Infrastructure', 'completed', 'P0', 2, 'Progress tracking and test results tables'),
('Admin Route Protection', 'Infrastructure', 'completed', 'P0', 4, 'Role-based access control for admin features'),
('Basic Admin Page Structure', 'Infrastructure', 'completed', 'P0', 6, 'Tab-based layout and component structure');

-- Enable RLS on new tables
ALTER TABLE admin_development_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_config_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access only
CREATE POLICY "Admin access to development progress" ON admin_development_progress
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin access to prompt test results" ON prompt_test_results
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin access to model performance logs" ON model_performance_logs
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin access to model config history" ON model_config_history
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER admin_development_progress_updated_at
    BEFORE UPDATE ON admin_development_progress
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER model_performance_logs_updated_at
    BEFORE UPDATE ON model_performance_logs
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();