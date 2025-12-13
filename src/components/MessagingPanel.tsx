import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string | null;
}

const MessagingPanel = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientAvatar,
}: MessagingPanelProps) => {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, markAsRead } = useMessages(recipientId);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark messages as read when panel opens
  useEffect(() => {
    if (isOpen && recipientId) {
      markAsRead.mutate();
    }
  }, [isOpen, recipientId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    sendMessage.mutate(newMessage.trim(), {
      onSuccess: () => {
        setNewMessage("");
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={recipientAvatar || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {getInitials(recipientName)}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-foreground uppercase tracking-wide text-sm">
            {recipientName}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={recipientAvatar || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-3xl">
                {getInitials(recipientName)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {recipientName.toUpperCase()}
            </h3>
            <p className="text-muted-foreground text-sm">
              Say 👋 to {recipientName.split(" ")[0]} to get the party started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {format(new Date(message.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${recipientName.split(" ")[0]}...`}
            className="flex-1 bg-secondary border-border"
            disabled={sendMessage.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessagingPanel;
