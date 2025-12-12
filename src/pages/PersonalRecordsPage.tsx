import { useNavigate } from "react-router-dom";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, TrendingUp, Dumbbell } from "lucide-react";
import { format } from "date-fns";

const PersonalRecordsPage = () => {
  const navigate = useNavigate();
  const { personalRecords, isLoading } = usePersonalRecords();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading records...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Personal Records</h1>
                <p className="text-sm text-muted-foreground">Your all-time bests</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Exercises Tracked</p>
                  <p className="text-2xl font-bold text-foreground">{personalRecords.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sets Logged</p>
                  <p className="text-2xl font-bold text-foreground">
                    {personalRecords.reduce((sum, pr) => sum + pr.totalSets, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personal Records List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              All Personal Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {personalRecords.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">No Records Yet</h2>
                <p className="text-muted-foreground">
                  Complete workouts to start tracking your personal records!
                </p>
                <Button 
                  onClick={() => navigate("/")} 
                  className="mt-4 bg-primary hover:bg-primary/90"
                >
                  Go to Workouts
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personalRecords.map((pr) => (
                  <div
                    key={pr.exerciseId}
                    className="p-4 bg-secondary/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-foreground">
                        {pr.exerciseName}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {pr.totalSets} sets
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Max Weight
                        </p>
                        <div className="flex items-center gap-2">
                          {pr.maxWeight > 0 && (
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          )}
                          <p className="text-xl font-bold text-primary">
                            {pr.maxWeight > 0 ? `${pr.maxWeight} lbs` : "—"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Max Reps
                        </p>
                        <p className="text-xl font-bold text-foreground">
                          {pr.maxReps > 0 ? pr.maxReps : "—"}
                        </p>
                      </div>
                    </div>
                    {pr.maxWeight > 0 && (
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        PR set on {format(new Date(pr.prDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PersonalRecordsPage;
