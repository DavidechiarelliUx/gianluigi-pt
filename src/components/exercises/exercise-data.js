import pushUpImage from "../../assets/exercises/push-up.webp";
import squatImage from "../../assets/exercises/squat.webp";
import plankImage from "../../assets/exercises/plank.webp";
import crunchImage from "../../assets/exercises/crunch.webp";
import lungeImage from "../../assets/exercises/lunge.webp";
import shoulderPressImage from "../../assets/exercises/shoulder-press.webp";
import bicepsCurlImage from "../../assets/exercises/biceps-curl.webp";
import mountainClimberImage from "../../assets/exercises/mountain-climber.webp";
import burpeeImage from "../../assets/exercises/burpee.webp";
import jumpingJackImage from "../../assets/exercises/jumping-jack.webp";
import dumbbellBenchPressImage from "../../assets/exercises/dumbbell-bench-press.webp";
import dumbbellRowImage from "../../assets/exercises/dumbbell-row.webp";
import gluteBridgeImage from "../../assets/exercises/glute-bridge.webp";
import tricepsDipImage from "../../assets/exercises/triceps-dip.webp";
import sidePlankImage from "../../assets/exercises/side-plank.webp";
import deadliftImage from "../../assets/exercises/deadlift.webp";
import latMachineAssistedPullUpImage from "../../assets/exercises/lat-machine-assisted-pull-up.webp";
import legPressImage from "../../assets/exercises/leg-press.webp";
import legCurlImage from "../../assets/exercises/leg-curl.webp";
import calfRaiseImage from "../../assets/exercises/calf-raise.webp";
import russianTwistImage from "../../assets/exercises/russian-twist.webp";
import sitUpImage from "../../assets/exercises/sit-up.webp";
import hipThrustImage from "../../assets/exercises/hip-thrust.webp";
import lateralRaiseImage from "../../assets/exercises/lateral-raise.webp";
import militaryPressPushPressImage from "../../assets/exercises/military-press-push-press.webp";

export const EXERCISE_ILLUSTRATIONS = [
  { id: "push-up", label: "Piegamenti", image: pushUpImage },
  { id: "squat", label: "Squat", image: squatImage },
  { id: "plank", label: "Plank", image: plankImage },
  { id: "crunch", label: "Crunch", image: crunchImage },
  { id: "lunge", label: "Affondi", image: lungeImage },
  { id: "shoulder-press", label: "Shoulder press", image: shoulderPressImage },
  { id: "biceps-curl", label: "Curl bicipiti", image: bicepsCurlImage },
  { id: "mountain-climber", label: "Mountain climber", image: mountainClimberImage },
  { id: "burpee", label: "Burpee", image: burpeeImage },
  { id: "jumping-jack", label: "Jumping jack", image: jumpingJackImage },
  { id: "dumbbell-bench-press", label: "Panca manubri", image: dumbbellBenchPressImage },
  { id: "dumbbell-row", label: "Rematore manubrio", image: dumbbellRowImage },
  { id: "glute-bridge", label: "Glute bridge", image: gluteBridgeImage },
  { id: "triceps-dip", label: "Dip tricipiti", image: tricepsDipImage },
  { id: "side-plank", label: "Side plank", image: sidePlankImage },
  { id: "deadlift", label: "Stacco da terra", image: deadliftImage },
  { id: "lat-machine-assisted-pull-up", label: "Lat machine / trazioni assistite", image: latMachineAssistedPullUpImage },
  { id: "leg-press", label: "Leg press", image: legPressImage },
  { id: "leg-curl", label: "Leg curl", image: legCurlImage },
  { id: "calf-raise", label: "Calf raise", image: calfRaiseImage },
  { id: "russian-twist", label: "Russian twist", image: russianTwistImage },
  { id: "sit-up", label: "Sit-up", image: sitUpImage },
  { id: "hip-thrust", label: "Hip thrust", image: hipThrustImage },
  { id: "lateral-raise", label: "Alzate laterali", image: lateralRaiseImage },
  { id: "military-press-push-press", label: "Military press / push press", image: militaryPressPushPressImage },
];

export const EXERCISE_ILLUSTRATION_MAP = new Map(
  EXERCISE_ILLUSTRATIONS.map((exercise) => [exercise.id, exercise])
);
