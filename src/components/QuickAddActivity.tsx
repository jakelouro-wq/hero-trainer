import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddManualActivity, ACTIVITY_TYPES } from "@/hooks/useManualActivities";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const QuickAddActivity = () => {
  const [open, setOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  
  const addActivity = useAddManualActivity();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedActivity) {
      toast({
        title: "Select an activity",
        description: "Please choose an activity type",
        variant: "destructive",
      });
      return;
    }

    try {
      await addActivity.mutateAsync({
        activity_type: selectedActivity,
        activity_date: date,
        duration_minutes: duration ? parseInt(duration) : undefined,
        notes: notes || undefined,
      });

      toast({
        title: "Activity logged!",
        description: `${ACTIVITY_TYPES.find(a => a.value === selectedActivity)?.label} added to your calendar`,
      });

      // Reset form
      setSelectedActivity(null);
      setDate(format(new Date(), "yyyy-MM-dd"));
      setDuration("");
      setNotes("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log activity. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Quick Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {/* Activity Type Grid */}
          <div>
            <Label className="text-sm text-muted-foreground mb-3 block">What did you do?</Label>
            <div className="grid grid-cols-4 gap-2">
              {ACTIVITY_TYPES.map((activity) => (
                <button
                  key={activity.value}
                  onClick={() => setSelectedActivity(activity.value)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedActivity === activity.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-secondary"
                  }`}
                >
                  <span className="text-2xl block mb-1">{activity.icon}</span>
                  <span className="text-xs font-medium">{activity.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date" className="text-sm text-muted-foreground">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration" className="text-sm text-muted-foreground">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="e.g., 45"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm text-muted-foreground">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="How was your activity?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          {/* Submit */}
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={!selectedActivity || addActivity.isPending}
          >
            {addActivity.isPending ? "Saving..." : "Log Activity"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddActivity;
