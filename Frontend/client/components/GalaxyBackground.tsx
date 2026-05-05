export default function GalaxyBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Dark background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>

      {/* Subtle dark nebula clouds */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gray-800/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-32 right-20 w-80 h-80 bg-gray-700/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gray-800/12 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-40 right-1/3 w-64 h-64 bg-gray-700/8 rounded-full blur-3xl animate-pulse delay-3000"></div>
        <div className="absolute top-1/2 left-1/2 w-88 h-88 bg-gray-800/10 rounded-full blur-3xl animate-pulse delay-4000"></div>
      </div>

      {/* Stars layer 1 - small distant stars */}
      <div className="absolute inset-0 stars-small"></div>

      {/* Stars layer 2 - medium stars */}
      <div className="absolute inset-0 stars-medium"></div>

      {/* Stars layer 3 - large bright stars */}
      <div className="absolute inset-0 stars-large"></div>

      {/* Shooting stars */}
      <div className="absolute inset-0">
        <div className="shooting-star shooting-star-1"></div>
        <div className="shooting-star shooting-star-2"></div>
        <div className="shooting-star shooting-star-3"></div>
      </div>
    </div>
  );
}
