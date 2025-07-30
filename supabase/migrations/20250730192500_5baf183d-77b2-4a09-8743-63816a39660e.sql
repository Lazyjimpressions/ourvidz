-- Create prompt templates table with SFW/NSFW variants
CREATE TABLE public.prompt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_type VARCHAR NOT NULL, -- 'sdxl', 'wan', 'qwen_instruct', 'qwen_base'
  use_case VARCHAR NOT NULL, -- 'enhancement', 'chat', 'generation'
  content_mode VARCHAR NOT NULL DEFAULT 'nsfw', -- 'sfw', 'nsfw'
  template_name VARCHAR NOT NULL,
  system_prompt TEXT NOT NULL,
  token_limit INTEGER DEFAULT 512,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT unique_template_per_model_usecase_mode UNIQUE(model_type, use_case, content_mode, template_name)
);

-- Create negative prompts table for SDXL
CREATE TABLE public.negative_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_type VARCHAR NOT NULL DEFAULT 'sdxl',
  content_mode VARCHAR NOT NULL DEFAULT 'nsfw', -- 'sfw', 'nsfw'
  negative_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- Higher priority = more important
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  description TEXT,
  CONSTRAINT unique_negative_prompt_per_model_mode UNIQUE(model_type, content_mode, negative_prompt)
);

-- Enable RLS
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negative_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin access to prompt templates" 
ON public.prompt_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin access to negative prompts" 
ON public.negative_prompts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_prompt_templates_updated_at
BEFORE UPDATE ON public.prompt_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_negative_prompts_updated_at
BEFORE UPDATE ON public.negative_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SFW/NSFW templates for enhance-prompt
INSERT INTO public.prompt_templates (model_type, use_case, content_mode, template_name, system_prompt, token_limit) VALUES
-- Qwen Instruct Templates
('qwen_instruct', 'enhancement', 'nsfw', 'default_nsfw', 'You are an expert prompt engineer specializing in adult content generation. Transform the user prompt into a detailed, explicit description that captures sensual details, intimate scenarios, and adult themes. Focus on visual elements, emotions, and explicit content while maintaining artistic quality. Be direct and descriptive about adult themes.', 512),
('qwen_instruct', 'enhancement', 'sfw', 'default_sfw', 'You are an expert prompt engineer. Transform the user prompt into a detailed, family-friendly description that captures visual elements, emotions, and artistic quality. Focus on composition, lighting, mood, and aesthetic details while keeping all content appropriate for general audiences.', 512),

-- Qwen Base Templates  
('qwen_base', 'enhancement', 'nsfw', 'default_nsfw', 'Enhance this prompt for adult content generation with explicit visual details and intimate scenarios:', 256),
('qwen_base', 'enhancement', 'sfw', 'default_sfw', 'Enhance this prompt for artistic content generation with detailed visual and aesthetic elements:', 256),

-- SDXL Templates
('sdxl', 'enhancement', 'nsfw', 'default_nsfw', 'Transform into detailed adult content prompt with explicit visual elements, intimate poses, and sensual details:', 256),
('sdxl', 'enhancement', 'sfw', 'default_sfw', 'Transform into detailed artistic prompt with composition, lighting, and aesthetic elements:', 256),

-- WAN Templates
('wan', 'enhancement', 'nsfw', 'default_nsfw', 'Enhance for adult video generation with explicit scenarios, intimate actions, and sensual details:', 256),
('wan', 'enhancement', 'sfw', 'default_sfw', 'Enhance for family-friendly video generation with detailed scenes and appropriate content:', 256);

-- Insert default negative prompts for SDXL
INSERT INTO public.negative_prompts (model_type, content_mode, negative_prompt, priority, description) VALUES
-- NSFW negative prompts (minimal restrictions)
('sdxl', 'nsfw', 'worst quality, low quality, blurry, pixelated', 1, 'Basic quality control'),
('sdxl', 'nsfw', 'watermark, text, signature, logo', 2, 'Remove unwanted overlays'),

-- SFW negative prompts (family-friendly restrictions)
('sdxl', 'sfw', 'worst quality, low quality, blurry, pixelated, watermark, text, signature, logo', 1, 'Quality and overlay control'),
('sdxl', 'sfw', 'nsfw, nude, naked, explicit, sexual, adult content, inappropriate', 2, 'Content safety restrictions'),
('sdxl', 'sfw', 'violence, gore, blood, weapons, disturbing', 3, 'Violence restrictions');