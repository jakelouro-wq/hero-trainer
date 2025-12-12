import { useState, useRef } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Image as ImageIcon, 
  Trophy,
  MoreHorizontal,
  Smile
} from "lucide-react";
import { useCommunityPosts, useCreatePost, useLikePost, useAddComment, useAllProfiles } from "@/hooks/useCommunity";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const CommunityPage = () => {
  const { user } = useAuth();
  const { data: posts, isLoading } = useCommunityPosts();
  const { data: allProfiles } = useAllProfiles();
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const addComment = useAddComment();

  const [newPost, setNewPost] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePostSubmit = async () => {
    if (!newPost.trim()) return;

    try {
      await createPost.mutateAsync({ content: newPost });
      setNewPost("");
      toast.success("Post shared!");
    } catch (error) {
      toast.error("Failed to create post");
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await likePost.mutateAsync(postId);
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      await addComment.mutateAsync({ postId, content });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleMentionSelect = (profile: { id: string; full_name: string | null }) => {
    const mention = `@${profile.full_name || "user"} `;
    const cursorPos = textareaRef.current?.selectionStart || newPost.length;
    const beforeCursor = newPost.slice(0, cursorPos).replace(/@\w*$/, "");
    const afterCursor = newPost.slice(cursorPos);
    setNewPost(beforeCursor + mention + afterCursor);
    setShowMentions(false);
    setMentionSearch("");
    textareaRef.current?.focus();
  };

  const handlePostChange = (value: string) => {
    setNewPost(value);
    const lastWord = value.split(/\s/).pop() || "";
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setShowMentions(true);
      setMentionSearch(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const filteredProfiles = allProfiles?.filter((p) =>
    p.full_name?.toLowerCase().includes(mentionSearch)
  );

  const isLikedByUser = (post: typeof posts extends (infer T)[] ? T : never) => {
    return post.post_likes?.some((like) => like.user_id === user?.id);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 container mx-auto px-4">
          <div className="animate-pulse text-muted-foreground text-center">Loading community...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Community</h1>

        {/* Create Post */}
        <div className="card-gradient rounded-xl p-4 border border-border mb-6">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user?.user_metadata?.full_name || user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Share your workout win, celebrate a milestone, or encourage others..."
                value={newPost}
                onChange={(e) => handlePostChange(e.target.value)}
                className="min-h-[80px] bg-secondary/50 border-border resize-none"
              />
              
              {/* Mention Suggestions */}
              {showMentions && filteredProfiles && filteredProfiles.length > 0 && (
                <div className="absolute z-10 bottom-full mb-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredProfiles.slice(0, 5).map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleMentionSelect(profile)}
                      className="w-full px-3 py-2 text-left hover:bg-secondary flex items-center gap-2"
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{profile.full_name || "User"}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Trophy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={handlePostSubmit}
                  disabled={!newPost.trim() || createPost.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts?.map((post) => (
            <div key={post.id} className="card-gradient rounded-xl border border-border overflow-hidden">
              {/* Post Header */}
              <div className="p-4 pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={post.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(post.profiles?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {post.profiles?.full_name || "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>

                {/* Badge Achievement */}
                {post.badges && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm">
                    <Trophy className="w-4 h-4" />
                    <span>Earned: {post.badges.name}</span>
                    <span>{post.badges.icon_url}</span>
                  </div>
                )}

                {/* Post Content */}
                <p className="mt-3 text-foreground whitespace-pre-wrap">{post.content}</p>

                {/* Post Image */}
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="mt-3 rounded-lg w-full object-cover max-h-96"
                  />
                )}
              </div>

              {/* Post Actions */}
              <div className="px-4 py-3 flex items-center gap-4 border-t border-border mt-4">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 transition-colors ${
                    isLikedByUser(post) ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLikedByUser(post) ? "fill-current" : ""}`} />
                  <span className="text-sm">{post.post_likes?.length || 0}</span>
                </button>
                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.post_comments?.length || 0}</span>
                </button>
              </div>

              {/* Comments Section */}
              {expandedComments.has(post.id) && (
                <div className="px-4 pb-4 border-t border-border">
                  {/* Existing Comments */}
                  <div className="space-y-3 mt-3">
                    {post.post_comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(comment.profiles?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2">
                          <p className="text-sm font-medium text-foreground">
                            {comment.profiles?.full_name || "Anonymous"}
                          </p>
                          <p className="text-sm text-foreground/90">{comment.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2 mt-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user?.user_metadata?.full_name || user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim()}
                        className="text-primary"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {posts?.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
              <p className="text-muted-foreground">Be the first to share your workout wins!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CommunityPage;
