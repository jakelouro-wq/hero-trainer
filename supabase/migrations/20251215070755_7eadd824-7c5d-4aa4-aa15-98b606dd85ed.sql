-- Add weight_unit column to profiles table for user preference
ALTER TABLE public.profiles 
ADD COLUMN weight_unit text NOT NULL DEFAULT 'lb' 
CHECK (weight_unit IN ('lb', 'kg'));