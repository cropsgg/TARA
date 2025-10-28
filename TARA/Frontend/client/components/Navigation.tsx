import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Satellite, Brain, Database, Radar, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Path Finder", path: "/path-finder", icon: Brain },
  { name: "Orchestrator", path: "/orchestrator", icon: Activity },
  { name: "Data Transfer", path: "/data-transfer", icon: Database },
  { name: "Detection", path: "/detection", icon: Radar },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gray-600/30 relative overflow-hidden">
      {/* Stars background layer */}
      <div className="absolute inset-0 nav-stars" />
      <div className="absolute inset-0 nav-stars-2" />
      <div className="absolute inset-0 nav-stars-3" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/tara-logo.png" 
              alt="TARA Logo" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 hover:ring-2 hover:ring-gray-400",
                    isActive
                      ? "bg-gray-700/30 text-gray-200 border border-gray-600/50"
                      : "text-gray-300 hover:text-white hover:bg-gray-700/20",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-white hover:bg-gray-700/20"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-600/30">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:ring-2 hover:ring-gray-400",
                      isActive
                        ? "bg-gray-700/30 text-gray-200 border border-gray-600/50"
                        : "text-gray-300 hover:text-white hover:bg-gray-700/20",
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
