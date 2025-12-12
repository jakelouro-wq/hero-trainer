-- Badge definitions table
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_url text,
  category text NOT NULL CHECK (category IN ('streak', 'weight', 'workouts', 'special')),
  threshold integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User earned badges
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Community posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  badge_id uuid REFERENCES public.badges(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Post comments
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Post likes
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Post mentions (for @tagging)
CREATE TABLE public.post_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;

-- Badges policies (viewable by all, manageable by coaches)
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Coaches can manage badges" ON public.badges FOR ALL USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

-- User badges policies
CREATE POLICY "Users can view all earned badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Community posts policies
CREATE POLICY "Anyone can view posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Anyone can view likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Mentions policies
CREATE POLICY "Anyone can view mentions" ON public.post_mentions FOR SELECT USING (true);
CREATE POLICY "Users can create mentions" ON public.post_mentions FOR INSERT WITH CHECK (true);

-- Insert default badges
INSERT INTO public.badges (name, description, category, threshold, icon_url) VALUES
-- Streak badges
('First Week', 'Complete workouts for 7 days straight', 'streak', 7, '🔥'),
('Two Week Warrior', 'Complete workouts for 14 days straight', 'streak', 14, '🔥'),
('Month Strong', 'Complete workouts for 30 days straight', 'streak', 30, '💪'),
('Iron Consistency', 'Complete workouts for 60 days straight', 'streak', 60, '🏆'),
-- Weight lifted badges
('First Ton', 'Lift 2,000 lbs total', 'weight', 2000, '🏋️'),
('5K Club', 'Lift 5,000 lbs total', 'weight', 5000, '🏋️'),
('10K Club', 'Lift 10,000 lbs total', 'weight', 10000, '💎'),
('50K Legend', 'Lift 50,000 lbs total', 'weight', 50000, '👑'),
('100K Beast', 'Lift 100,000 lbs total', 'weight', 100000, '🦁'),
-- Workouts completed badges
('Getting Started', 'Complete 5 workouts', 'workouts', 5, '⭐'),
('Committed', 'Complete 25 workouts', 'workouts', 25, '⭐'),
('Dedicated', 'Complete 50 workouts', 'workouts', 50, '🌟'),
('Centurion', 'Complete 100 workouts', 'workouts', 100, '💫'),
('Elite', 'Complete 250 workouts', 'workouts', 250, '🏅');