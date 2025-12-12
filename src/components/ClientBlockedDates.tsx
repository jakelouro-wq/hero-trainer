import { useState } from "react";
import { Plus, Trash2, CalendarOff, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClientBlockedDatesProps {
  clientId: string;
  clientName: string;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ClientBlockedDates = ({ clientId, clientName }: ClientBlockedDatesProps) => {
  const [open, setOpen] = useState(false);
  const [blockType, setBlockType] = useState<"day" | "date">("day");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch blocked dates for this specific client
  const { data: blockedDates, isLoading } = useQuery({
    queryKey: ["client-blocked-dates", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_dates")
        .select("*")
        .eq("client_id", clientId)
        .order("blocked_day_of_week", { ascending: true, nullsFirst: false })
        .order("blocked_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const addBlocked = useMutation({
    mutationFn: async (blocked: {
      blocked_date?: string;
      blocked_day_of_week?: number;
      reason?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("blocked_dates")
        .insert({
          coach_id: user.id,
          blocked_date: blocked.blocked_date || null,
          blocked_day_of_week: blocked.blocked_day_of_week ?? null,
          client_id: clientId,
          reason: blocked.reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-blocked-dates", clientId] });
      queryClient.invalidateQueries({ queryKey: ["blocked-dates"] });
    },
  });

  const deleteBlocked = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-blocked-dates", clientId] });
      queryClient.invalidateQueries({ queryKey: ["blocked-dates"] });
    },
  });

  const handleSubmit = async () => {
    try {
      if (blockType === "day" && !selectedDay) {
        toast({ title: "Select a day", variant: "destructive" });
        return;
      }
      if (blockType === "date" && !selectedDate) {
        toast({ title: "Select a date", variant: "destructive" });
        return;
      }

      await addBlocked.mutateAsync({
        blocked_day_of_week: blockType === "day" ? parseInt(selectedDay) : undefined,
        blocked_date: blockType === "date" ? selectedDate : undefined,
        reason: reason || undefined,
      });

      toast({ title: "Blocked date added" });
      setOpen(false);
      setSelectedDay("");
      setSelectedDate("");
      setReason("");
    } catch (error) {
      toast({ title: "Error adding blocked date", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBlocked.mutateAsync(id);
      toast({ title: "Blocked date removed" });
    } catch (error) {
      toast({ title: "Error removing blocked date", variant: "destructive" });
    }
  };

  const recurringDays = blockedDates?.filter((b) => b.blocked_day_of_week !== null) || [];
  const specificDates = blockedDates?.filter((b) => b.blocked_date !== null) || [];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-destructive" />
            Blocked Dates for {clientName}
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Block Workout Day</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <RadioGroup value={blockType} onValueChange={(v) => setBlockType(v as "day" | "date")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="day" id="day" />
                    <Label htmlFor="day">Recurring day of week</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="date" />
                    <Label htmlFor="date">Specific date</Label>
                  </div>
                </RadioGroup>

                {blockType === "day" ? (
                  <div>
                    <Label>Day of Week</Label>
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label>Reason (optional)</Label>
                  <Input
                    placeholder="e.g., Vacation, Rest day"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={addBlocked.isPending}>
                  {addBlocked.isPending ? "Adding..." : "Block This Day"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : blockedDates?.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No blocked dates configured for this client
          </p>
        ) : (
          <div className="space-y-4">
            {/* Recurring Days */}
            {recurringDays.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Recurring Days</h4>
                <div className="space-y-2">
                  {recurringDays.map((blocked) => (
                    <div
                      key={blocked.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <CalendarOff className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            Every {DAY_NAMES[blocked.blocked_day_of_week!]}
                          </p>
                          {blocked.reason && (
                            <p className="text-xs text-muted-foreground">{blocked.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(blocked.id)}
                        disabled={deleteBlocked.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specific Dates */}
            {specificDates.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Specific Dates</h4>
                <div className="space-y-2">
                  {specificDates.map((blocked) => (
                    <div
                      key={blocked.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {format(new Date(blocked.blocked_date!), "MMMM d, yyyy")}
                          </p>
                          {blocked.reason && (
                            <p className="text-xs text-muted-foreground">{blocked.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(blocked.id)}
                        disabled={deleteBlocked.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientBlockedDates;
