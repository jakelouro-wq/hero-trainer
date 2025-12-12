import { useEffect } from "react";
import Header from "@/components/Header";
import { useBadges, useUserBadges, useCheckAndAwardBadges, useUserStats } from "@/hooks/useBadges";
import { Trophy, Flame, Dumbbell, Target, Lock } from "lucide-react";
import { format } from "date-fns";

const BadgesPage = () => {
  const { data: allBadges, isLoading: badgesLoading } = useBadges();
  const { data: userBadges, isLoading: userBadgesLoading } = useUserBadges();
  const { data: stats } = useUserStats();
  const checkBadges = useCheckAndAwardBadges();

  // Check for new badges when stats update
  useEffect(() => {
    if (stats) {
      checkBadges.mutate(stats);
    }
  }, [stats]);

  const earnedBadgeIds = new Set(userBadges?.map((ub) => ub.badge_id) || []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "streak":
        return <Flame className="w-6 h-6" />;
      case "weight":
        return <Dumbbell className="w-6 h-6" />;
      case "workouts":
        return <Target className="w-6 h-6" />;
      default:
        return <Trophy className="w-6 h-6" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "streak":
        return "from-orange-500 to-red-500";
      case "weight":
        return "from-blue-500 to-cyan-500";
      case "workouts":
        return "from-green-500 to-emerald-500";
      default:
        return "from-purple-500 to-pink-500";
    }
  };

  const groupedBadges = allBadges?.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, typeof allBadges>);

  const categoryLabels: Record<string, string> = {
    streak: "Streak Achievements",
    weight: "Weight Lifted Milestones",
    workouts: "Workout Completions",
    special: "Special Awards",
  };

  if (badgesLoading || userBadgesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 container mx-auto px-4">
          <div className="animate-pulse text-muted-foreground text-center">Loading badges...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 container mx-auto px-4">
        {/* Stats Summary */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Your Achievements</h1>
          <p className="text-muted-foreground">
            {userBadges?.length || 0} of {allBadges?.length || 0} badges earned
          </p>
        </div>

        {/* Current Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card-gradient rounded-xl p-4 border border-border text-center">
            <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.currentStreak || 0}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="card-gradient rounded-xl p-4 border border-border text-center">
            <Dumbbell className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalWeightLifted?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">lbs Lifted</p>
          </div>
          <div className="card-gradient rounded-xl p-4 border border-border text-center">
            <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalWorkouts || 0}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </div>
        </div>

        {/* Badge Categories */}
        {groupedBadges && Object.entries(groupedBadges).map(([category, badges]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              {getCategoryIcon(category)}
              {categoryLabels[category] || category}
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges?.map((badge) => {
                const isEarned = earnedBadgeIds.has(badge.id);
                const earnedBadge = userBadges?.find((ub) => ub.badge_id === badge.id);

                return (
                  <div
                    key={badge.id}
                    className={`relative rounded-xl p-4 border transition-all duration-300 ${
                      isEarned
                        ? "card-gradient border-primary/50 shadow-lg shadow-primary/20"
                        : "bg-secondary/30 border-border opacity-60"
                    }`}
                  >
                    {/* Badge Icon */}
                    <div
                      className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-3xl ${
                        isEarned
                          ? `bg-gradient-to-br ${getCategoryColor(category)}`
                          : "bg-secondary"
                      }`}
                    >
                      {isEarned ? (
                        <span>{badge.icon_url}</span>
                      ) : (
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Badge Info */}
                    <h3 className={`font-semibold text-center mb-1 ${isEarned ? "text-foreground" : "text-muted-foreground"}`}>
                      {badge.name}
                    </h3>
                    <p className="text-xs text-muted-foreground text-center mb-2">
                      {badge.description}
                    </p>

                    {/* Progress or Earned Date */}
                    {isEarned && earnedBadge ? (
                      <p className="text-xs text-primary text-center font-medium">
                        Earned {format(new Date(earnedBadge.earned_at), "MMM d, yyyy")}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getCategoryColor(category)} transition-all duration-500`}
                            style={{
                              width: `${Math.min(
                                100,
                                ((category === "weight"
                                  ? stats?.totalWeightLifted || 0
                                  : category === "workouts"
                                  ? stats?.totalWorkouts || 0
                                  : stats?.currentStreak || 0) /
                                  badge.threshold) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          {category === "weight" && `${stats?.totalWeightLifted?.toLocaleString() || 0} / ${badge.threshold.toLocaleString()} lbs`}
                          {category === "workouts" && `${stats?.totalWorkouts || 0} / ${badge.threshold} workouts`}
                          {category === "streak" && `${stats?.currentStreak || 0} / ${badge.threshold} days`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default BadgesPage;
