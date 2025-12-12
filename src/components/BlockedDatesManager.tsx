import { useState } from "react";
import { Plus, Trash2, CalendarOff, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useBlockedDates, useAddBlockedDate, useDeleteBlockedDate, DAY_NAMES } from "@/hooks/useBlockedDates";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  full_name: string | null;
}

const BlockedDatesManager = () => {
  const [open, setOpen] = useState(false);
  const [blockType, setBlockType] = useState<"day" | "date">("day");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [reason, setReason] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients-for-blocking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: blockedDates, isLoading } = useBlockedDates();
  const addBlocked = useAddBlockedDate();
  const deleteBlocked = useDeleteBlockedDate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      if (!selectedClientId) {
        toast({ title: "Select a client", variant: "destructive" });
        return;
      }
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
        client_id: selectedClientId,
        reason: reason || undefined,
      });

      toast({ title: "Blocked date added" });
      setOpen(false);
      setSelectedDay("");
      setSelectedDate("");
      setSelectedClientId("");
      setReason("");
    } catch (error) {
      toast({ title: "Error adding blocked date", variant: "destructive" });
    }
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "All Clients";
    const client = clients?.find((c) => c.id === clientId);
    return client?.full_name || "Unknown Client";
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="w-5 h-5" />
              Blocked Dates
            </CardTitle>
            <CardDescription>
              Block days or dates where workouts won't be scheduled
            </CardDescription>
          </div>
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
                <div>
                  <Label>Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name || "Unnamed Client"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                    placeholder="e.g., Rest day, Holiday"
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
          <p className="text-muted-foreground text-sm">No blocked dates configured</p>
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
                          <p className="font-medium">
                            Every {DAY_NAMES[blocked.blocked_day_of_week!]}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {getClientName(blocked.client_id)}
                            {blocked.reason && ` • ${blocked.reason}`}
                          </p>
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
                          <p className="font-medium">
                            {format(new Date(blocked.blocked_date!), "MMMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {getClientName(blocked.client_id)}
                            {blocked.reason && ` • ${blocked.reason}`}
                          </p>
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

export default BlockedDatesManager;
