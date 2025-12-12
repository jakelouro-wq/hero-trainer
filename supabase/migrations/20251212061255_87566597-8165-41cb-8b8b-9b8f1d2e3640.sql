-- Create exercise library table for reusable exercises
CREATE TABLE public.exercise_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  video_url TEXT,
  instructions TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

-- Coaches can view all exercises
CREATE POLICY "Coaches can view all exercises"
ON public.exercise_library
FOR SELECT
USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Coaches can create exercises
CREATE POLICY "Coaches can create exercises"
ON public.exercise_library
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Coaches can update exercises
CREATE POLICY "Coaches can update exercises"
ON public.exercise_library
FOR UPDATE
USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Coaches can delete exercises
CREATE POLICY "Coaches can delete exercises"
ON public.exercise_library
FOR DELETE
USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_exercise_library_updated_at
BEFORE UPDATE ON public.exercise_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();