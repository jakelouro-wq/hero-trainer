-- Add superset_group column to exercises table for grouping exercises in supersets/circuits
ALTER TABLE public.exercises ADD COLUMN superset_group text NULL;