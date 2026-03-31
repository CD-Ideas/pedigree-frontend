"use client";

export default function Particles() {
  const particles = Array.from({ length: 35 }, (_, i) => ({
    left: `${(i * 37 + 13) % 100}%`,
    delay: `${(i * 2.7) % 25}s`,
    duration: `${18 + (i * 3.3) % 30}s`,
    size: (i % 4 === 0) ? 3 : (i % 3 === 0) ? 2 : 1.5,
    opacity: (i % 5 === 0) ? 0.5 : (i % 3 === 0) ? 0.3 : 0.15,
    color: i % 4 === 0
      ? 'rgba(220, 38, 38, 0.6)'   // red embers
      : i % 3 === 0
        ? 'rgba(212, 168, 85, 0.5)' // gold sparks
        : 'rgba(220, 38, 38, 0.25)', // dim red
  }));

  return (
    <div className="particles">
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: p.opacity,
            background: p.color,
            boxShadow: i % 4 === 0 ? `0 0 ${p.size * 3}px ${p.color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}
