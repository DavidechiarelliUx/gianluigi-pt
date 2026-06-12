import { useEffect, useState } from "react";
import screenAllenamento from "../../assets/app-preview/screen-allenamento.png";
import screenHome from "../../assets/app-preview/screen-home.png";
import screenLive from "../../assets/app-preview/screen-live.png";

const INTERVAL = 3200;

const SLIDES = [
  {
    id: "home",
    src: screenHome,
    alt: "Home app cliente - Buonasera Valerio",
  },
  {
    id: "allenamento",
    src: screenAllenamento,
    alt: "Schermata allenamento - Scheda 2",
  },
  {
    id: "live",
    src: screenLive,
    alt: "Schermata sessioni live",
  },
];

export function AppPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % SLIDES.length);
    }, INTERVAL);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  return (
    <div
      className="relative mx-auto w-full max-w-[322px] select-none pb-9"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div
        className="relative w-full p-3"
        style={{
          aspectRatio: "910 / 1610",
          borderRadius: 28,
          background: "linear-gradient(155deg, #2b2f2b, #0c0d0c 60%)",
          boxShadow: "0 0 0 1.5px rgba(57,255,20,0.18), 0 30px 80px rgba(0,0,0,0.65), 0 0 50px rgba(57,255,20,0.12)",
        }}
      >
        <div aria-hidden className="absolute right-[-3px] top-[150px] h-16 w-[3px] rounded-sm bg-[#1a1c1a]" />
        <div aria-hidden className="absolute left-[-3px] top-[120px] h-10 w-[3px] rounded-sm bg-[#1a1c1a]" />
        <div aria-hidden className="absolute left-[-3px] top-[170px] h-10 w-[3px] rounded-sm bg-[#1a1c1a]" />

        <div
          className="relative h-full w-full overflow-hidden bg-black"
          style={{
            borderRadius: 28,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          <div
            className="flex h-full will-change-transform"
            style={{
              transform: `translateX(${-activeIndex * 100}%)`,
              transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {SLIDES.map((slide) => (
              <div key={slide.id} className="h-full w-full shrink-0">
                <img src={slide.src} alt={slide.alt} className="block h-full w-full object-cover object-top" draggable="false" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2.5">
        {SLIDES.map((slide, index) => {
          const isActive = activeIndex === index;

          return (
            <button
              key={slide.id}
              type="button"
              aria-label={`Mostra schermata ${index + 1}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
              className="h-2 rounded-full border-0 p-0 transition-all duration-300"
              style={{
                width: isActive ? 26 : 8,
                background: isActive ? "#39FF14" : "rgba(255,255,255,0.22)",
                boxShadow: isActive ? "0 0 12px rgba(57,255,20,0.6)" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
