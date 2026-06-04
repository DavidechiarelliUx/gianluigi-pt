import { cn } from "../../lib/utils";

const DEFAULT_STROKE = "currentColor";

function Line({ points, ...props }) {
  return <polyline points={points} fill="none" strokeLinecap="round" strokeLinejoin="round" {...props} />;
}

function CircleShape({ cx, cy, r = 7, ...props }) {
  return <circle cx={cx} cy={cy} r={r} fill="none" {...props} />;
}

function PushUp({ phase, strokeProps }) {
  const load = phase === "load";
  const y = load ? 70 : 54;
  const elbow = load ? "66 80 78 82 88 70" : "66 70 78 86 90 96";

  return (
    <>
      <CircleShape cx="44" cy={y - 6} r="6" {...strokeProps} />
      <Line points={`52 ${y - 2} 86 ${y + 2} 118 ${y + 8}`} {...strokeProps} />
      <Line points={elbow} {...strokeProps} />
      <Line points={`102 ${y + 5} 128 90 146 98`} {...strokeProps} />
      <Line points="22 100 150 100" opacity="0.22" {...strokeProps} />
    </>
  );
}

function Squat({ phase, strokeProps }) {
  const load = phase === "load";

  return load ? (
    <>
      <CircleShape cx="78" cy="30" {...strokeProps} />
      <Line points="78 38 70 58 88 70" {...strokeProps} />
      <Line points="70 58 46 68 28 68" {...strokeProps} />
      <Line points="88 70 70 92 52 100" {...strokeProps} />
      <Line points="88 70 112 92 134 94" {...strokeProps} />
      <Line points="38 42 72 50 104 46 126 40" {...strokeProps} />
    </>
  ) : (
    <>
      <CircleShape cx="78" cy="24" {...strokeProps} />
      <Line points="78 32 78 58 86 82" {...strokeProps} />
      <Line points="78 42 48 46 30 42" {...strokeProps} />
      <Line points="78 42 108 46 130 42" {...strokeProps} />
      <Line points="86 82 66 104 48 104" {...strokeProps} />
      <Line points="86 82 108 104 130 104" {...strokeProps} />
    </>
  );
}

function Plank({ strokeProps }) {
  return (
    <>
      <CircleShape cx="42" cy="58" r="6" {...strokeProps} />
      <Line points="50 60 84 62 122 66" {...strokeProps} />
      <Line points="64 62 54 84 42 90" {...strokeProps} />
      <Line points="86 62 82 84 70 90" {...strokeProps} />
      <Line points="116 66 140 82 150 82" {...strokeProps} />
      <Line points="24 92 154 92" opacity="0.22" {...strokeProps} />
    </>
  );
}

function Lunge({ phase, strokeProps }) {
  const load = phase === "load";

  return load ? (
    <>
      <CircleShape cx="76" cy="28" {...strokeProps} />
      <Line points="76 36 72 58 86 76" {...strokeProps} />
      <Line points="74 46 48 56 30 54" {...strokeProps} />
      <Line points="78 46 104 54 126 52" {...strokeProps} />
      <Line points="86 76 58 92 34 92" {...strokeProps} />
      <Line points="86 76 112 92 142 92" {...strokeProps} />
    </>
  ) : (
    <>
      <CircleShape cx="78" cy="24" {...strokeProps} />
      <Line points="78 32 78 58 82 82" {...strokeProps} />
      <Line points="78 44 52 50 36 48" {...strokeProps} />
      <Line points="78 44 106 50 126 48" {...strokeProps} />
      <Line points="82 82 62 104 44 104" {...strokeProps} />
      <Line points="82 82 106 104 128 104" {...strokeProps} />
    </>
  );
}

function ShoulderPress({ phase, strokeProps }) {
  const load = phase === "load";

  return (
    <>
      <CircleShape cx="80" cy="34" {...strokeProps} />
      <Line points="80 42 80 70 82 94" {...strokeProps} />
      <Line points={load ? "72 50 58 42 50 34" : "72 50 56 22 50 14"} {...strokeProps} />
      <Line points={load ? "88 50 104 42 112 34" : "88 50 104 22 110 14"} {...strokeProps} />
      <Line points="64 94 48 108" {...strokeProps} />
      <Line points="94 94 112 108" {...strokeProps} />
      <Line points={load ? "42 32 58 32" : "42 12 58 12"} {...strokeProps} />
      <Line points={load ? "104 32 120 32" : "102 12 118 12"} {...strokeProps} />
    </>
  );
}

function BicepsCurl({ phase, strokeProps }) {
  const load = phase === "load";

  return (
    <>
      <CircleShape cx="80" cy="28" {...strokeProps} />
      <Line points="80 36 78 66 82 94" {...strokeProps} />
      <Line points={load ? "72 48 52 48 44 36" : "72 48 54 68 46 86"} {...strokeProps} />
      <Line points={load ? "88 48 108 48 116 36" : "88 48 106 68 114 86"} {...strokeProps} />
      <Line points="64 94 48 108" {...strokeProps} />
      <Line points="96 94 112 108" {...strokeProps} />
      <Line points={load ? "38 34 50 34" : "40 86 52 86"} {...strokeProps} />
      <Line points={load ? "110 34 122 34" : "108 86 120 86"} {...strokeProps} />
    </>
  );
}

function Crunch({ phase, strokeProps }) {
  const load = phase === "load";

  return load ? (
    <>
      <CircleShape cx="58" cy="54" r="6" {...strokeProps} />
      <Line points="66 58 86 70 106 76" {...strokeProps} />
      <Line points="82 70 64 86 52 90" {...strokeProps} />
      <Line points="104 76 122 94 142 94" {...strokeProps} />
      <Line points="104 76 94 96 76 100" {...strokeProps} />
      <Line points="24 100 150 100" opacity="0.22" {...strokeProps} />
    </>
  ) : (
    <>
      <CircleShape cx="46" cy="82" r="6" {...strokeProps} />
      <Line points="54 84 84 88 112 92" {...strokeProps} />
      <Line points="76 88 58 100 44 102" {...strokeProps} />
      <Line points="112 92 132 102 150 102" {...strokeProps} />
      <Line points="112 92 94 104 76 104" {...strokeProps} />
      <Line points="24 106 154 106" opacity="0.22" {...strokeProps} />
    </>
  );
}

function JumpingJack({ phase, strokeProps }) {
  const load = phase === "load";

  return (
    <>
      <CircleShape cx="80" cy="28" {...strokeProps} />
      <Line points="80 36 80 62 80 86" {...strokeProps} />
      <Line points={load ? "78 46 42 18" : "78 46 58 64"} {...strokeProps} />
      <Line points={load ? "82 46 118 18" : "82 46 102 64"} {...strokeProps} />
      <Line points={load ? "80 86 48 110" : "80 86 66 108"} {...strokeProps} />
      <Line points={load ? "80 86 112 110" : "80 86 94 108"} {...strokeProps} />
    </>
  );
}

function MountainClimber({ phase, strokeProps }) {
  const load = phase === "load";

  return (
    <>
      <CircleShape cx="42" cy="46" r="6" {...strokeProps} />
      <Line points="50 50 82 56 116 64" {...strokeProps} />
      <Line points="64 52 54 82 40 94" {...strokeProps} />
      <Line points="86 58 82 88 70 98" {...strokeProps} />
      <Line points={load ? "112 64 88 86 70 86" : "112 64 136 86 150 86"} {...strokeProps} />
      <Line points={load ? "116 64 140 88 152 88" : "116 64 94 88 78 88"} {...strokeProps} />
      <Line points="24 100 154 100" opacity="0.22" {...strokeProps} />
    </>
  );
}

function Burpee({ phase, strokeProps }) {
  if (phase === "load") {
    return <PushUp phase="load" strokeProps={strokeProps} />;
  }

  return (
    <>
      <CircleShape cx="80" cy="24" {...strokeProps} />
      <Line points="80 32 80 58 82 82" {...strokeProps} />
      <Line points="76 42 48 24" {...strokeProps} />
      <Line points="84 42 112 24" {...strokeProps} />
      <Line points="82 82 62 104 48 104" {...strokeProps} />
      <Line points="82 82 104 104 122 104" {...strokeProps} />
    </>
  );
}

const EXERCISE_RENDERERS = {
  "push-up": PushUp,
  squat: Squat,
  plank: Plank,
  lunge: Lunge,
  "shoulder-press": ShoulderPress,
  "biceps-curl": BicepsCurl,
  crunch: Crunch,
  "jumping-jack": JumpingJack,
  "mountain-climber": MountainClimber,
  burpee: Burpee,
};

export function ExerciseIllustration({
  exercise = "push-up",
  phase = "load",
  strokeColor = DEFAULT_STROKE,
  showBackground = true,
  glow = true,
  className,
  title,
}) {
  const normalizedPhase = phase === "start" ? "load" : phase === "end" ? "unload" : phase;
  const Renderer = EXERCISE_RENDERERS[exercise] ?? PushUp;
  const label = title ?? `${exercise} ${normalizedPhase}`;
  const strokeProps = {
    stroke: strokeColor,
    strokeWidth: 5,
    vectorEffect: "non-scaling-stroke",
  };

  return (
    <svg
      viewBox="0 0 160 120"
      role="img"
      aria-label={label}
      className={cn("h-full w-full text-accent", className)}
    >
      {showBackground && (
        <>
          <rect width="160" height="120" rx="18" className="fill-bg" />
          <rect x="1" y="1" width="158" height="118" rx="17" className="fill-transparent stroke-accent/20" />
        </>
      )}
      {glow && <Renderer phase={normalizedPhase} strokeProps={{ ...strokeProps, strokeWidth: 8, opacity: 0.18 }} />}
      <Renderer phase={normalizedPhase} strokeProps={strokeProps} />
    </svg>
  );
}
