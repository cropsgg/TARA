import { useEffect, useState, useCallback } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  delay: number;
  color: string;
}

export default function CursorTrail() {
  const [stars, setStars] = useState<Star[]>([]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    
    // Create a new star at cursor position with white color only
    const newStar: Star = {
      id: Date.now() + Math.random(),
      x,
      y,
      opacity: 1,
      scale: Math.random() * 0.8 + 0.2, // Random size between 0.2 and 1.0
      delay: Math.random() * 0.2, // Random delay for staggered animation
      color: '#ffffff', // Pure white color
    };

    setStars(prevStars => {
      // Keep only the last 60 stars for performance
      const updatedStars = [...prevStars, newStar];
      if (updatedStars.length > 60) {
        return updatedStars.slice(-60);
      }
      return updatedStars;
    });

    // Remove stars after animation completes
    setTimeout(() => {
      setStars(prevStars => prevStars.filter(star => star.id !== newStar.id));
    }, 800);
  }, []);

  useEffect(() => {
    // Throttle mouse events for better performance
    let timeoutId: NodeJS.Timeout;
    let lastCall = 0;
    const throttle = 16; // ~60fps

    const throttledMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastCall >= throttle) {
        lastCall = now;
        handleMouseMove(e);
      }
    };

    window.addEventListener('mousemove', throttledMouseMove);

    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
      clearTimeout(timeoutId);
    };
  }, [handleMouseMove]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full cursor-star-trail"
          style={{
            left: star.x - 4, // Center the star on cursor
            top: star.y - 4,
            width: `${star.scale * 2.5}px`,
            height: `${star.scale * 2.5}px`,
            backgroundColor: '#ffffff',
            opacity: star.opacity,
            transform: `scale(${star.scale})`,
            animationDelay: `${star.delay}s`,
            boxShadow: `0 0 ${star.scale * 6}px #ffffff, 0 0 ${star.scale * 10}px #ffffff60`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  );
}
