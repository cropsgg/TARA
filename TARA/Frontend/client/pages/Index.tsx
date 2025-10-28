import { useState, useEffect, useRef, useLayoutEffect } from "react";
import ParticleGalaxy from "@/components/ParticleGalaxy";
import GalaxyBackground from "@/components/GalaxyBackground";
import CursorTrail from "@/components/CursorTrail";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Globe,
  Users,
  Shield,
} from "lucide-react";

export default function Index() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [hoveredAchyut, setHoveredAchyut] = useState(false);
  const [hoveredAkshita, setHoveredAkshita] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || window.pageYOffset);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Parallax progress when moving from hero (1 viewport) into mission section
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;
  const start = viewportH * 0.6;
  const end = viewportH * 1.6;
  const raw = (scrollY - start) / Math.max(1, end - start);
  const progress = Math.min(1, Math.max(0, raw));
  const parallaxY = (1 - progress) * 40 - 40; // from -40px to 0px
  const parallaxOpacity = 0.6 + progress * 0.4; // 0.6 -> 1

  // Diagnostics: log geometry to identify bottom gap source
  useLayoutEffect(() => {
    const logGeometry = () => {
      const vc = videoContainerRef.current;
      const v = videoRef.current;
      if (!vc || !v) return;
      const vcRect = vc.getBoundingClientRect();
      const vRect = v.getBoundingClientRect();
      const distanceBottom = Math.round(vcRect.bottom - vRect.bottom);
      // eslint-disable-next-line no-console
      console.log("[Mission Video Diagnostics]", {
        viewportH: window.innerHeight,
        container: { top: Math.round(vcRect.top), bottom: Math.round(vcRect.bottom), height: Math.round(vcRect.height) },
        video: { top: Math.round(vRect.top), bottom: Math.round(vRect.bottom), height: Math.round(vRect.height) },
        distanceBottom,
      });
    };

    logGeometry();
    const onResize = () => logGeometry();
    const onScrollDiag = () => logGeometry();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScrollDiag, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScrollDiag);
    };
  }, []);

  return (
    <div className="min-h-screen relative bg-black">
      <GalaxyBackground />
      <CursorTrail />
      {/* Hero Section with Particle Galaxy */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <ParticleGalaxy />

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto">
          <div
            className={`transform transition-all duration-1000 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
          >
            <img 
              src="/tara-logo.png" 
              alt="TARA Logo" 
              className="mb-0 max-w-full h-auto mx-auto drop-shadow-[0_0_2px_rgba(0,0,0,0.8)] drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]"
              style={{ maxHeight: '150px' }}
            />
            <div
              className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-gray-700 to-gray-800 text-white text-sm md:text-base cursor-pointer hover:from-gray-600 hover:to-gray-700 transition-colors"
              role="button"
              tabIndex={0}
              aria-label="Scroll to mission section"
              onClick={() => {
                const el = document.getElementById('mission');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  const el = document.getElementById('mission');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              Click on me to scroll down
            </div>
 
          </div>
        </div>
 
 
      </section>

      {/* Team Section */}
      <section className="py-20 px-6 relative z-10 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Team</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">The minds behind TARA — building advanced lunar and planetary rover navigation.</p>
          </div>

          <div className="grid gap-6 md:gap-8 md:grid-cols-4 relative">
            {/* Connecting Heart Animation - Between Achyut and Akshita */}
            {(hoveredAchyut || hoveredAkshita) && (
              <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <div className="text-pink-400 text-4xl animate-bounce">💕</div>
              </div>
            )}
            
            <div 
              className="rounded-xl border border-gray-600/30 bg-gray-900/40 p-6 text-center relative group"
              onMouseEnter={() => setHoveredAchyut(true)}
              onMouseLeave={() => setHoveredAchyut(false)}
            >
              <h3 className="text-xl font-semibold text-white">Achyut Mukund</h3>
              <p className="text-gray-400 mt-1">ML & Backend</p>
              {hoveredAchyut && (
                <div className="absolute top-2 right-2 text-pink-400 text-lg">💖</div>
              )}
            </div>
            
            <div 
              className="rounded-xl border border-gray-600/30 bg-gray-900/40 p-6 text-center relative group"
              onMouseEnter={() => setHoveredAkshita(true)}
              onMouseLeave={() => setHoveredAkshita(false)}
            >
              <h3 className="text-xl font-semibold text-white">Akshita Sharma</h3>
              <p className="text-gray-400 mt-1">Frontend & Design</p>
              {hoveredAkshita && (
                <div className="absolute top-2 right-2 text-pink-400 text-lg">💖</div>
              )}
            </div>
            
            <div className="rounded-xl border border-gray-600/30 bg-gray-900/40 p-6 text-center">
              <h3 className="text-xl font-semibold text-white">Adarsh Kumar</h3>
              <p className="text-gray-400 mt-1">ML & Backend</p>
            </div>
            
            <div className="rounded-xl border border-gray-600/30 bg-gray-900/40 p-6 text-center">
              <h3 className="text-xl font-semibold text-white">Arzaan Wadiya</h3>
              <p className="text-gray-400 mt-1">ML</p>
            </div>
          </div>
        </div>
      </section>

      {/* Combined Mission + CTA with single video background */}
      <section id="mission" className="relative overflow-hidden pb-0 mb-0">
        {/* Single rover video (no zoom/crop) */}
        <div ref={videoContainerRef} className="relative bg-black overflow-hidden" style={{ transform: `translateY(${parallaxY}px)`, transition: 'transform 300ms ease', opacity: parallaxOpacity }}>
          <video
            ref={videoRef}
            className="block w-full h-auto object-contain mx-auto pointer-events-none bg-black"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/rover-bg.mp4" type="video/mp4" />
          </video>
          {/* Subtle overlay for readability */}
          <div className="absolute inset-0 bg-black/15" />

          {/* Mission content overlay */}
          <div className="absolute inset-0 flex items-start">
            <div className="relative z-10 w-full px-6 pt-16 pb-24 md:pt-24 max-w-6xl mx-auto">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Mission Critical Systems
                </h2>
                <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
                  Advanced rover technologies ensuring safe and efficient lunar exploration
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                <Card className="bg-gradient-to-b from-gray-900/40 to-gray-800/40 border-gray-600/20 hover:border-gray-500/40 transition-all duration-300 group">
                  <CardContent className="p-6 md:p-8 text-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-5 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">AI Path Planning</h3>
                    <p className="text-gray-200 leading-relaxed">Intelligent navigation algorithms that adapt to terrain complexity and energy constraints</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-b from-gray-900/40 to-gray-800/40 border-gray-600/20 hover:border-gray-500/40 transition-all duration-300 group">
                  <CardContent className="p-6 md:p-8 text-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-5 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Globe className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Real-time Detection</h3>
                    <p className="text-gray-200 leading-relaxed">Advanced computer vision for landslide and boulder detection ensuring mission safety</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-b from-gray-900/40 to-gray-800/40 border-gray-600/20 hover:border-gray-500/40 transition-all duration-300 group">
                  <CardContent className="p-6 md:p-8 text-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-5 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Blockchain Data</h3>
                    <p className="text-gray-200 leading-relaxed">Immutable mission data storage with satellite-to-ground secure communication protocols</p>
                  </CardContent>
                </Card>
              </div>

              {/* CTA content overlay below cards */}
              <div className="mt-14 md:mt-20 text-center">
                <div className="h-64 md:h-72 mb-5 md:mb-6" aria-hidden="true"></div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 md:mb-6">Ready for Lunar Exploration?</h2>
                <p className="text-lg md:text-xl text-gray-200 mb-6 md:mb-8 max-w-2xl mx-auto">
                  Experience the future of autonomous rover navigation with TARA's advanced AI-powered mission planning systems
                </p>
                
              </div>
            </div>
          </div>

          
         </div>
       </section>
    </div>
  );
}
