-- Drop the existing restrictive delete policy for users
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.user_workouts;

-- Create a new permissive delete policy that allows users OR coaches to delete
CREATE POLICY "Users and coaches can delete workouts" 
ON public.user_workouts 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'coach'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);