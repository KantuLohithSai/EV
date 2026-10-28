import React, { useState } from 'react';
import { AlertTriangle, MapPin, Search, Navigation, Battery, UserCheck, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  currentCity: string;
  onCityChange: (city: string) => void;
  onSearchLocation: (query: string) => void;
  onDetectLocation: () => void;
  emergencyMode: boolean;
  onToggleEmergency: (active: boolean) => void;
  currentSoc: number;
  onSocChange: (soc: number) => void;
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
  selectedProfile?: string;
  onProfileSelect?: (profile: string) => void;
  activeTab?: 'map' | 'profiles';
  onTabChange?: (tab: 'map' | 'profiles') => void;
  onOpenProfileModal: () => void;
}

const INDIAN_METROS = [
  "Vijayawada", "Bengaluru", "New Delhi / NCR", "Mumbai", "Hyderabad", 
  "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi"
];

export const Header: React.FC<HeaderProps> = ({
  theme,
  onThemeToggle,
  currentCity,
  onCityChange,
  onSearchLocation,
  onDetectLocation,
  emergencyMode,
  onToggleEmergency,
  currentSoc,
  onSocChange,
  onOpenProfileModal
}) => {
  const [searchInput, setSearchInput] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearchLocation(searchInput.trim());
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel-heavy border-b border-violet-500/20 px-4 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          


          <div className="flex items-center gap-2 w-full lg:w-auto">
            <form onSubmit={handleSearchSubmit} className="header-search flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-800 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20 w-full lg:w-72 transition-all">
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search location or landmark..."
                className="bg-transparent text-xs text-slate-100 focus:outline-none w-full placeholder:text-slate-500 font-medium"
              />
              <button type="submit" className="primary-action header-search-button text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer">
                Search
              </button>
            </form>

            <button
              onClick={onDetectLocation}
              title="Automatically detect my exact GPS location"
              className="primary-action px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Navigation className="w-4 h-4 fill-current" /> GPS Location
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-800">
              <MapPin className="w-4 h-4 text-violet-400 shrink-0" />
              <select
                value={currentCity}
                onChange={(e) => onCityChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                {(INDIAN_METROS.includes(currentCity) ? INDIAN_METROS : [currentCity, ...INDIAN_METROS]).map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-slate-200">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-900/90 px-3.5 py-2 rounded-2xl border border-slate-800">
              <Battery className={`w-4 h-4 ${currentSoc <= 15 ? 'text-rose-400' : 'text-cyan-400'}`} />
              <div className="text-xs font-mono text-slate-300 flex items-center gap-1">
                <span>SoC:</span>
                <span className={`font-black ${currentSoc <= 15 ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {currentSoc}%
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="100"
                value={currentSoc}
                onChange={(e) => onSocChange(Number(e.target.value))}
                className="soc-range w-16 cursor-pointer"
              />
            </div>

            <button
              onClick={() => onToggleEmergency(!emergencyMode)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                emergencyMode || currentSoc <= 10
                  ? 'danger-action animate-pulse pulse-glow-red'
                  : 'secondary-action hover:border-rose-500/40 hover:text-rose-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              {emergencyMode || currentSoc <= 10 ? 'RESCUE ACTIVE' : 'Emergency Mode'}
            </button>

            {/* Profile Icon Button beside Emergency Mode */}
            <button
              onClick={onOpenProfileModal}
              title="Open EV User Profiler Preferences Modal"
              className="secondary-action px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <UserCheck className="w-4 h-4 text-violet-400" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={onThemeToggle}
              aria-pressed={theme === 'light'}
              title={theme === 'dark' ? 'Switch to Day Drive theme' : 'Switch to Night Drive theme'}
              className="theme-toggle-button px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{theme === 'dark' ? 'Day' : 'Night'}</span>
            </button>

          </div>

        </div>

      </div>
    </header>
  );
};
