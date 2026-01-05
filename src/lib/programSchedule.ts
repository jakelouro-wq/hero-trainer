import { addDays, format, parseISO, startOfWeek } from "date-fns";

/**
 * Computes scheduled dates for workouts based on a program start date and workout template placement.
 *
 * Assumptions:
 * - workout_templates.day_number is the day-of-week number (1=Mon ... 7=Sun)
 * - workout_templates.week_number is the week index (1-based)
 * - start_date represents the first week of the program
 */
export const getProgramWeek1Monday = (startDate: string) => {
  const start = parseISO(startDate);
  let monday = startOfWeek(start, { weekStartsOn: 1 });

  // If user picked a mid-week start date, begin from the *next* Monday
  if (monday < start) monday = addDays(monday, 7);

  return monday;
};

export const getProgramScheduledDate = (
  startDate: string,
  weekNumber: number,
  dayNumber: number
) => {
  const monday = getProgramWeek1Monday(startDate);
  return addDays(monday, (weekNumber - 1) * 7 + (dayNumber - 1));
};

export const getProgramScheduledDateStr = (
  startDate: string,
  weekNumber: number,
  dayNumber: number
) => {
  return format(getProgramScheduledDate(startDate, weekNumber, dayNumber), "yyyy-MM-dd");
};
