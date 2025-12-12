import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  badge_id: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  badges: {
    name: string;
    icon_url: string;
  } | null;
  post_likes: { user_id: string }[];
  post_comments: {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
}

export const useCommunityPosts = () => {
  return useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles!community_posts_user_id_fkey (full_name, avatar_url),
          badges (name, icon_url),
          post_likes (user_id),
          post_comments (
            id,
            user_id,
            content,
            created_at,
            profiles:profiles!post_comments_user_id_fkey (full_name, avatar_url)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as unknown as CommunityPost[];
    },
  });
};

export const useCreatePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { content: string; image_url?: string; badge_id?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          content: data.content,
          image_url: data.image_url || null,
          badge_id: data.badge_id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
};

export const useLikePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if already liked
      const { data: existing } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Unlike
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
};

export const useAddComment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { postId: string; content: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("post_comments")
        .insert({
          post_id: data.postId,
          user_id: user.id,
          content: data.content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
};

export const useAllProfiles = () => {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url");

      if (error) throw error;
      return data;
    },
  });
};
