-- Add new columns to api_usage_logs for better cost tracking and prompt inspection
ALTER TABLE public.api_usage_logs 
ADD COLUMN IF NOT EXISTS cost_eur NUMERIC(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS prompt_content TEXT,
ADD COLUMN IF NOT EXISTS response_content TEXT,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;

-- Update existing records to have a total_tokens value (input + output)
UPDATE public.api_usage_logs 
SET total_tokens = input_tokens + output_tokens 
WHERE total_tokens = 0;

-- Calculate EUR for existing records based on a fixed rate of 0.92
UPDATE public.api_usage_logs 
SET cost_eur = estimated_cost_usd * 0.92 
WHERE cost_eur = 0;
