import { supabase } from "@/integrations/supabase/client";
import { addDays, getDay, format } from "date-fns";

interface RemainingWorkout {
  id: string;
  scheduled_date: string;
}

/**
 * Reschedules remaining uncompleted workouts to the same weekdays going forward.
 * For example, if a Monday workout is completed on Thursday, the next Wednesday workout
 * will be moved to the following Wednesday, and so on.
 */
export const rescheduleRemainingWorkouts = async (
  userId: string,
  completedWorkoutId: string
): Promise<void> => {
  // Get all remaining uncompleted workouts ordered by scheduled_date
  const { data: remainingWorkouts, error: fetchError } = await supabase
    .from("user_workouts")
    .select("id, scheduled_date")
    .eq("user_id", userId)
    .eq("completed", false)
    .neq("id", completedWorkoutId)
    .order("scheduled_date", { ascending: true });

  if (fetchError) {
    console.error("Error fetching remaining workouts:", fetchError);
    return;
  }

  if (!remainingWorkouts || remainingWorkouts.length === 0) {
    console.log("No remaining workouts to reschedule");
    return;
  }

  // Get today's date (when the workout was completed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group workouts that need rescheduling (those scheduled before or on today)
  const workoutsToReschedule: RemainingWorkout[] = [];
  const workoutsAlreadyFuture: RemainingWorkout[] = [];

  remainingWorkouts.forEach((workout) => {
    const workoutDate = new Date(workout.scheduled_date);
    workoutDate.setHours(0, 0, 0, 0);
    
    if (workoutDate <= today) {
      workoutsToReschedule.push(workout);
    } else {
      workoutsAlreadyFuture.push(workout);
    }
  });

  if (workoutsToReschedule.length === 0) {
    console.log("No past workouts need rescheduling");
    return;
  }

  // Find the next occurrence of each workout's original weekday
  const updates: { id: string; scheduled_date: string }[] = [];
  
  // Start looking from tomorrow
  let searchStartDate = addDays(today, 1);
  
  // If there are future workouts, we need to reschedule past ones to come BEFORE them
  // by finding the next available occurrence of their weekday before the first future workout
  
  for (const workout of workoutsToReschedule) {
    const originalDate = new Date(workout.scheduled_date);
    const targetWeekday = getDay(originalDate); // 0 = Sunday, 1 = Monday, etc.
    
    // Find the next occurrence of this weekday starting from searchStartDate
    let newDate = new Date(searchStartDate);
    
    // Find next occurrence of the target weekday
    while (getDay(newDate) !== targetWeekday) {
      newDate = addDays(newDate, 1);
    }
    
    // Make sure this new date doesn't conflict with other already-scheduled dates
    // and comes after any previously rescheduled workout
    const newDateStr = format(newDate, "yyyy-MM-dd");
    
    // Check if this date is already taken by a future workout
    const isDateTaken = workoutsAlreadyFuture.some(
      (w) => w.scheduled_date === newDateStr
    ) || updates.some((u) => u.scheduled_date === newDateStr);
    
    if (isDateTaken) {
      // Move to the next week
      newDate = addDays(newDate, 7);
    }
    
    updates.push({
      id: workout.id,
      scheduled_date: format(newDate, "yyyy-MM-dd"),
    });
    
    // Update search start date to be after this new date to maintain order
    searchStartDate = addDays(newDate, 1);
  }

  // Apply the updates
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("user_workouts")
      .update({ scheduled_date: update.scheduled_date })
      .eq("id", update.id);

    if (updateError) {
      console.error(`Error rescheduling workout ${update.id}:`, updateError);
    } else {
      console.log(`Rescheduled workout ${update.id} to ${update.scheduled_date}`);
    }
  }

  console.log(`Rescheduled ${updates.length} workouts`);
};
