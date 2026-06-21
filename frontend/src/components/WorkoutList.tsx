import type { Workout } from "../types";

type WorkoutListProps = {
  workouts: Workout[];
};

function formatExerciseName(exerciseType: string) {
  return exerciseType.replace(/_/g, " ");
}

function formatDurationFromMinutes(durationMinutes: number) {
  const totalSeconds = Math.round(durationMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours === 0) {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatPaceMinutesPerKm(minutesPerKm: number) {
  const totalSeconds = Math.round(minutesPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
}

function formatWorkoutDetails(workout: Workout) {
  if (workout.sets && workout.reps) {
    const repLabel = workout.exercise_type === "plank" ? "sec" : "reps";
    const load = workout.weight ? ` at ${workout.weight} ${workout.weight_unit ?? "kg"}` : "";
    return `${workout.sets} x ${workout.reps} ${repLabel}${load} on ${workout.date}`;
  }

  const base = `${workout.amount} ${workout.unit}`;
  if (workout.exercise_type !== "walking" && workout.duration) {
    const pace =
      workout.unit === "km" && workout.amount > 0
        ? ` (${formatPaceMinutesPerKm(workout.duration / workout.amount)})`
        : "";
    const stepsRate =
      workout.unit === "steps" && workout.amount > 0
        ? ` (${Math.round(workout.amount / workout.duration)} steps/min)`
        : "";
    return `${base} in ${formatDurationFromMinutes(workout.duration)}${pace}${stepsRate} on ${workout.date}`;
  }

  return `${base} on ${workout.date}`;
}

export function WorkoutList({ workouts }: WorkoutListProps) {
  if (workouts.length === 0) {
    return (
      <div className="empty-state rich-empty-state">
        <strong>No workouts logged yet</strong>
        <span>Start with a walk, a short strength circuit, or today&apos;s recommendation.</span>
      </div>
    );
  }

  return (
    <div className="workout-list">
      {workouts.map((workout) => (
        <article className="workout-row" key={workout.id}>
          <div>
            <p className="workout-title">{formatExerciseName(workout.exercise_type)}</p>
            {workout.exercise_group && <p className="workout-group">{workout.exercise_group}</p>}
            <p className="muted">{formatWorkoutDetails(workout)}</p>
          </div>
          <strong className="xp-pill">{workout.xp_earned} XP</strong>
        </article>
      ))}
    </div>
  );
}
