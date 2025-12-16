import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import ProgressRing from "@/components/ProgressRing";
import QuickAddActivity from "@/components/QuickAddActivity";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, Calendar, TrendingUp, Zap, ChevronRight, Dumbbell, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNextWorkout, useUpcomingWorkouts } from "@/hooks/useNextWorkout";
import { useUserStats } from "@/hooks/useUserStats";
import { useInProgressWorkout } from "@/hooks/useInProgressWorkout";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user } = useAuth();
  const { data: nextWorkout, isLoading: workoutLoading } = useNextWorkout();
  const { data: upcomingWorkouts } = useUpcomingWorkouts(3);
  const { data: stats } = useUserStats();
  const { inProgressWorkout } = useInProgressWorkout();
  const navigate = useNavigate();

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Athlete";

  const formatWorkoutDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-8 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="mb-8 opacity-0 animate-fade-in">
            <p className="text-muted-foreground mb-2">Welcome back,</p>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight uppercase">
              {userName.split(" ")[0]} <span className="text-primary">{userName.split(" ")[1] || ""}</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Ready for your next workout? <span className="text-primary font-semibold">Let's go!</span>
            </p>
          </div>

          {/* Weekly Calendar with Quick Add */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">This Week</h2>
            <QuickAddActivity />
          </div>
          <WeeklyCalendar />
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Today's Workout */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resume In-Progress Workout Banner */}
            {inProgressWorkout && (
              <div className="bg-primary/10 border-2 border-primary rounded-2xl p-6 animate-pulse-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-primary text-sm font-semibold uppercase tracking-wider">Workout In Progress</p>
                      <p className="text-foreground font-medium mt-1">You have unsaved workout data</p>
                    </div>
                  </div>
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold glow transition-all duration-300 hover:scale-105"
                    onClick={() => navigate(`/workout/${inProgressWorkout.workoutId}`)}
                  >
                    Resume Workout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Next Workout */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                {nextWorkout ? "Next Workout" : "Today's Workout"}
              </h2>
              
              {workoutLoading ? (
                <div className="card-gradient rounded-2xl border border-border p-8 text-center">
                  <div className="animate-pulse text-muted-foreground">Loading workout...</div>
                </div>
              ) : nextWorkout ? (
                <div className="card-gradient rounded-2xl border border-border p-6 opacity-0 animate-scale-in" style={{ animationDelay: "200ms" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary text-sm font-medium uppercase tracking-wider mb-1">
                        {formatWorkoutDate(nextWorkout.scheduled_date)}
                      </p>
                      <h3 className="text-3xl font-bold text-foreground">{nextWorkout.workout_template.title}</h3>
                      <div className="flex items-center gap-4 mt-3 text-muted-foreground">
                        <span className="text-sm">{nextWorkout.workout_template.duration || "45 min"}</span>
                        <span className="text-sm">•</span>
                        <span className="text-sm">{nextWorkout.workout_template.focus || "Full Body"}</span>
                      </div>
                    </div>
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold glow transition-all duration-300 hover:scale-105"
                      onClick={() => navigate(`/workout/${nextWorkout.id}`)}
                    >
                      Start Workout
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="card-gradient rounded-2xl border border-border p-8 text-center">
                  <p className="text-muted-foreground mb-2">No workouts scheduled</p>
                  <p className="text-sm text-muted-foreground">
                    Contact your coach to get your training program set up.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Your Progress
            </h2>
            
            {/* Program Progress */}
            <div className="card-gradient rounded-xl p-6 border border-border opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="flex justify-around">
                <ProgressRing 
                  progress={stats?.programProgress || 0} 
                  label={stats?.programName || "Program"} 
                  value={`${stats?.programProgress || 0}%`} 
                />
              </div>
              {stats?.programName && (
                <p className="text-center text-xs text-muted-foreground mt-2">Program Completion</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatsCard
                icon={Calendar}
                label="Workouts"
                value={stats?.workoutsThisWeek?.toString() || "0"}
                subtext="This week"
                delay={500}
              />
              <StatsCard
                icon={Dumbbell}
                label="Weight Lifted"
                value={stats?.totalWeightLiftedWeek ? stats.totalWeightLiftedWeek.toLocaleString() : "0"}
                subtext="lbs this week"
                delay={600}
              />
              <div 
                onClick={() => navigate("/records")}
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <StatsCard
                  icon={Flame}
                  label="New PRs"
                  value={stats?.newRecordsThisWeek?.toString() || "0"}
                  subtext="This week"
                  delay={700}
                />
              </div>
              <StatsCard
                icon={Trophy}
                label="Program"
                value={`${stats?.programProgress || 0}%`}
                subtext="Complete"
                delay={800}
              />
            </div>

            {/* Upcoming */}
            <div className="card-gradient rounded-xl p-5 border border-border opacity-0 animate-fade-in" style={{ animationDelay: "900ms" }}>
              <h3 className="font-semibold text-foreground mb-4">Coming Up</h3>
              <div className="space-y-3">
                {upcomingWorkouts && upcomingWorkouts.length > 0 ? (
                  upcomingWorkouts.map((workout: any) => (
                    <div key={workout.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{workout.workout_templates?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatWorkoutDate(workout.scheduled_date)}
                        </p>
                      </div>
                      <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                        {workout.workout_templates?.focus || "Workout"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming workouts scheduled
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
