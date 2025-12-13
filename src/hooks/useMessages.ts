import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export const useMessages = (recipientId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch messages between current user and recipient
  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", user?.id, recipientId],
    queryFn: async () => {
      if (!user?.id || !recipientId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user?.id && !!recipientId,
  });

  // Send a message
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !recipientId) throw new Error("Missing user or recipient");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id, recipientId] });
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || !recipientId) return;

      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", recipientId)
        .eq("recipient_id", user.id)
        .is("read_at", null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id, recipientId] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id || !recipientId) return;

    const channel = supabase
      .channel(`messages-${user.id}-${recipientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          queryClient.invalidateQueries({ queryKey: ["messages", user?.id, recipientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, recipientId, queryClient]);

  return {
    messages: messages || [],
    isLoading,
    sendMessage,
    markAsRead,
  };
};

// Hook to get unread message counts
export const useUnreadMessages = () => {
  const { user } = useAuth();

  const { data: unreadCounts } = useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};

      const { data, error } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("recipient_id", user.id)
        .is("read_at", null);

      if (error) throw error;

      // Group by sender
      const counts: Record<string, number> = {};
      data.forEach((msg) => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!user?.id,
  });

  // Subscribe to real-time updates for unread
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { unreadCounts: unreadCounts || {} };
};
