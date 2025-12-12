-- Create table for blocked dates/days
CREATE TABLE public.blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL,
  -- For specific dates
  blocked_date DATE,
  -- For recurring days (0=Sunday, 1=Monday, etc.)
  blocked_day_of_week INTEGER CHECK (blocked_day_of_week >= 0 AND blocked_day_of_week <= 6),
  -- Optional: apply to specific client only (null = all clients)
  client_id UUID,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure at least one of date or day_of_week is set
  CONSTRAINT date_or_day_required CHECK (blocked_date IS NOT NULL OR blocked_day_of_week IS NOT NULL)
);

-- Enable Row Level Security
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own blocked dates
CREATE POLICY "Coaches can view their blocked dates"
ON public.blocked_dates
FOR SELECT
USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can create blocked dates"
ON public.blocked_dates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can update their blocked dates"
ON public.blocked_dates
FOR UPDATE
USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can delete their blocked dates"
ON public.blocked_dates
FOR DELETE
USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

-- Create index for efficient queries
CREATE INDEX idx_blocked_dates_date ON public.blocked_dates(blocked_date);
CREATE INDEX idx_blocked_dates_day ON public.blocked_dates(blocked_day_of_week);