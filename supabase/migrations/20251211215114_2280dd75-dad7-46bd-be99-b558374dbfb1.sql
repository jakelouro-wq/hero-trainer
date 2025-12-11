-- Create user roles enum and table for coach access
CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create programs table (program templates that can be assigned to users)
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_weeks integer NOT NULL DEFAULT 4,
  days_per_week integer NOT NULL DEFAULT 4,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view all programs"
ON public.programs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can create programs"
ON public.programs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can update programs"
ON public.programs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can delete programs"
ON public.programs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

-- Link workout templates to programs (program weeks/days)
ALTER TABLE public.workout_templates 
ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS week_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS day_number integer DEFAULT 1;

-- Create client_programs table to assign programs to users
CREATE TABLE public.client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view all client programs"
ON public.client_programs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Coaches can assign programs"
ON public.client_programs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can update client programs"
ON public.client_programs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can delete client programs"
ON public.client_programs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

-- Allow coaches to manage exercises
DROP POLICY IF EXISTS "Authenticated users can view exercises" ON public.exercises;

CREATE POLICY "All authenticated users can view exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Coaches can create exercises"
ON public.exercises
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can update exercises"
ON public.exercises
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can delete exercises"
ON public.exercises
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

-- Allow coaches to manage workout templates
DROP POLICY IF EXISTS "Authenticated users can view workout templates" ON public.workout_templates;

CREATE POLICY "All authenticated users can view workout templates"
ON public.workout_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Coaches can create workout templates"
ON public.workout_templates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can update workout templates"
ON public.workout_templates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can delete workout templates"
ON public.workout_templates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

-- Allow coaches to view all profiles for client management
CREATE POLICY "Coaches can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR auth.uid() = id);

-- Allow coaches to manage user workouts for scheduling
CREATE POLICY "Coaches can manage all user workouts"
ON public.user_workouts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);