import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import type { CreateWorkoutPayload, ExerciseGroup, ExerciseType } from "../types";

type LogWorkoutProps = {
  onCreateWorkout: (payload: CreateWorkoutPayload) => Promise<void>;
};

type ExerciseOption = {
  label: string;
  value: ExerciseType;
  unit: string;
};

const exerciseGroups: Array<{ label: string; value: ExerciseGroup }> = [
  { label: "Cardio", value: "cardio" },
  { label: "Calisthenics", value: "calisthenics" },
  { label: "Gym", value: "gym" },
];

const exerciseOptions: Record<ExerciseGroup, ExerciseOption[]> = {
  cardio: [
    { label: "Running", value: "running", unit: "km" },
    { label: "Walking", value: "walking", unit: "steps" },
    { label: "Cycling", value: "cycling", unit: "km" },
    { label: "Swimming", value: "swimming", unit: "km" },
  ],
  calisthenics: [
    { label: "Pushups", value: "pushup", unit: "reps" },
    { label: "Situps", value: "situp", unit: "reps" },
    { label: "Pullups", value: "pullup", unit: "reps" },
    { label: "Dips", value: "dip", unit: "reps" },
    { label: "Bodyweight Squats", value: "bodyweight_squat", unit: "reps" },
    { label: "Lunges", value: "lunge", unit: "reps" },
    { label: "Plank", value: "plank", unit: "seconds" },
    { label: "Burpees", value: "burpee", unit: "reps" },
  ],
  gym: [
    { label: "Bench Press", value: "bench_press", unit: "reps" },
    { label: "Back Squat", value: "back_squat", unit: "reps" },
    { label: "Deadlift", value: "deadlift", unit: "reps" },
    { label: "Shoulder Press", value: "shoulder_press", unit: "reps" },
    { label: "Barbell Row", value: "barbell_row", unit: "reps" },
    { label: "Lat Pulldown", value: "lat_pulldown", unit: "reps" },
    { label: "Leg Press", value: "leg_press", unit: "reps" },
    { label: "Chest Press Machine", value: "chest_press_machine", unit: "reps" },
    { label: "Cable Row", value: "cable_row", unit: "reps" },
  ],
};

export function LogWorkout({ onCreateWorkout }: LogWorkoutProps) {
  const [exerciseGroup, setExerciseGroup] = useState<ExerciseGroup>("calisthenics");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("pushup");
  const [amount, setAmount] = useState("5");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("20");
  const [rpe, setRpe] = useState("6");
  const [durationHours, setDurationHours] = useState("0");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("0");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedExercise = exerciseOptions[exerciseGroup].find((item) => item.value === exerciseType);
  const unit = selectedExercise?.unit ?? "reps";
  const isCardio = exerciseGroup === "cardio";
  const isWalking = exerciseType === "walking";
  const isGym = exerciseGroup === "gym";
  const isPlank = exerciseType === "plank";
  const totalDurationSeconds =
    Number(durationHours || 0) * 3600 +
    Number(durationMinutes || 0) * 60 +
    Number(durationSeconds || 0);

  function formatPace(minutesPerKm: number) {
    const totalSeconds = Math.round(minutesPerKm * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
  }

  const paceLabel = useMemo(() => {
    const numericAmount = Number(amount);
    if (!isCardio || isWalking || !numericAmount || !totalDurationSeconds) return "";
    const totalDurationMinutes = totalDurationSeconds / 60;
    if (unit === "km") return formatPace(totalDurationMinutes / numericAmount);
    if (unit === "steps") return `${Math.round(numericAmount / totalDurationMinutes)} steps/min`;
    return "";
  }, [amount, isCardio, totalDurationSeconds, unit]);

  function handleGroupChange(nextGroup: ExerciseGroup) {
    setExerciseGroup(nextGroup);
    const firstExercise = exerciseOptions[nextGroup][0];
    setExerciseType(firstExercise.value);
    setMessage("");

    if (nextGroup === "cardio") {
      setAmount(firstExercise.unit === "steps" ? "5000" : "3");
      setDurationHours("0");
      setDurationMinutes("30");
      setDurationSeconds("0");
    } else {
      setAmount("5");
      setSets("3");
      setReps("10");
      setDurationHours("0");
      setDurationMinutes("");
      setDurationSeconds("0");
    }
  }

  function handleExerciseChange(nextExercise: ExerciseType) {
    setExerciseType(nextExercise);
    setMessage("");
    const nextOption = exerciseOptions[exerciseGroup].find((option) => option.value === nextExercise);

    if (nextExercise === "walking") {
      setAmount("5000");
      setDurationHours("0");
      setDurationMinutes("");
      setDurationSeconds("0");
      setRpe("3");
      return;
    }

    if (exerciseGroup === "cardio") {
      setAmount(nextOption?.unit === "steps" ? "5000" : "3");
      setDurationHours("0");
      setDurationMinutes("30");
      setDurationSeconds("0");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);
    const numericDuration = isCardio && !isWalking ? totalDurationSeconds / 60 : null;
    const numericSets = Number(sets);
    const numericReps = Number(reps);
    const numericWeight = weight ? Number(weight) : null;
    const numericRpe = Number(rpe);

    if (isCardio && (Number.isNaN(numericAmount) || numericAmount <= 0)) {
      setMessage(isWalking ? "Enter your step count for the walk." : "Enter a distance greater than zero.");
      return;
    }

    if (isCardio && !isWalking && (!numericDuration || Number.isNaN(numericDuration) || numericDuration <= 0)) {
      setMessage("Enter the completed time so FitQuest can calculate pace.");
      return;
    }

    if (!isCardio && (Number.isNaN(numericSets) || numericSets <= 0)) {
      setMessage("Enter how many sets you completed.");
      return;
    }

    if (!isCardio && (Number.isNaN(numericReps) || numericReps <= 0)) {
      setMessage(isPlank ? "Enter seconds held per set." : "Enter reps completed per set.");
      return;
    }

    if (isGym && (!numericWeight || Number.isNaN(numericWeight) || numericWeight <= 0)) {
      setMessage("Enter the training weight used for this gym exercise.");
      return;
    }

    if (!isWalking && (Number.isNaN(numericRpe) || numericRpe < 1 || numericRpe > 10)) {
      setMessage("Choose an RPE from 1 to 10.");
      return;
    }

    const strengthAmount = numericSets * numericReps;
    const payload: CreateWorkoutPayload = {
      exercise_group: exerciseGroup,
      exercise_type: exerciseType,
      amount: isCardio ? numericAmount : strengthAmount,
      unit,
      duration: numericDuration,
      sets: isCardio ? null : numericSets,
      reps: isCardio ? null : numericReps,
      weight: isGym ? numericWeight : null,
      weight_unit: isGym ? "kg" : null,
      rpe: isWalking ? null : numericRpe,
    };

    setIsSubmitting(true);
    setMessage("");

    try {
      await onCreateWorkout(payload);
      setMessage("Workout saved.");
    } catch {
      setMessage("Could not save workout.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page narrow-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Log Workout</p>
          <h1>Record today&apos;s training</h1>
          <p className="page-subtitle">Choose a training style, enter the useful details, and FitQuest handles XP.</p>
        </div>
      </header>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-intro">
          <strong>{selectedExercise?.label ?? "Workout"} log</strong>
          <span>
            {isWalking
              ? "Walking is tracked by steps only, so no time or effort score is needed."
              : isCardio
                ? "Timed cardio uses distance, duration, and effort for pace-based coaching."
                : "Strength work uses sets, reps, and effort to guide progression."}
          </span>
        </div>
        <label>
          Training group
          <select value={exerciseGroup} onChange={(event) => handleGroupChange(event.target.value as ExerciseGroup)}>
            {exerciseGroups.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Exercise
          <select value={exerciseType} onChange={(event) => handleExerciseChange(event.target.value as ExerciseType)}>
            {exerciseOptions[exerciseGroup].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isCardio ? (
          <>
            <label>
              {unit === "steps" ? "Steps" : "Distance"}
              <div className="amount-row">
                <input
                  min="0"
                  onChange={(event) => setAmount(event.target.value)}
                  step={unit === "km" ? "0.1" : "1"}
                  type="number"
                  value={amount}
                />
                <span>{unit}</span>
              </div>
            </label>

            {!isWalking && (
              <label>
                Time
                <div className="time-row">
                  <input
                    min="0"
                    onChange={(event) => setDurationHours(event.target.value)}
                    step="1"
                    type="number"
                    value={durationHours}
                  />
                  <input
                    max="59"
                    min="0"
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    step="1"
                    type="number"
                    value={durationMinutes}
                  />
                  <input
                    max="59"
                    min="0"
                    onChange={(event) => setDurationSeconds(event.target.value)}
                    step="1"
                    type="number"
                    value={durationSeconds}
                  />
                </div>
                <span className="field-help">Hours : minutes : seconds</span>
              </label>
            )}

            {paceLabel && <p className="form-message">Pace: {paceLabel}</p>}
          </>
        ) : (
          <>
            <div className="form-grid">
              <label>
                Sets
                <input min="1" onChange={(event) => setSets(event.target.value)} step="1" type="number" value={sets} />
              </label>

              <label>
                {isPlank ? "Seconds per set" : "Reps per set"}
                <input min="1" onChange={(event) => setReps(event.target.value)} step="1" type="number" value={reps} />
              </label>
            </div>

            {isGym && (
              <label>
                Weight
                <div className="amount-row">
                  <input min="0" onChange={(event) => setWeight(event.target.value)} step="0.5" type="number" value={weight} />
                  <span>kg</span>
                </div>
              </label>
            )}
          </>
        )}

        {!isWalking && (
          <label>
            Effort / RPE
            <select value={rpe} onChange={(event) => setRpe(event.target.value)}>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}/10
                </option>
              ))}
            </select>
          </label>
        )}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving workout..." : "Log workout and earn XP"}
        </button>

        {message && <p className="form-message">{message}</p>}
      </form>
    </section>
  );
}
