import React from 'react';
import type { StationRecommendation } from '../types';
import { AlertTriangle, Zap, ShieldCheck, Navigation, X } from 'lucide-react';

interface EmergencyRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  topRescueStation: StationRecommendation | null;
  currentSoc: number;
  onConfirmRescue: (stationId: string) => void;
}

export const EmergencyRescueModal: React.FC<EmergencyRescueModalProps> = ({
  isOpen,
  onClose,
  topRescueStation,
  currentSoc,
  onConfirmRescue
}) => {
  if (!isOpen || !topRescueStation) return null;

  const st = topRescueStation.station;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-rose-500/50 shadow-2xl shadow-rose-500/20 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-rose-500/30 pb-4">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-bounce">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full">
              CRITICAL BATTERY RESCUE PROTOCOL
            </span>
            <h2 className="text-xl font-extrabold text-white mt-1">
              Low Battery Emergency ({currentSoc}% SoC)
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Vehicle battery state of charge is critically low. AI Emergency Rescue Engine has evaluated nearby chargers and prioritized the safest, nearest, guaranteed-available fast charger.
        </p>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-rose-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-rose-300">{st.name}</h3>
            <span className="px-2 py-1 text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg">
              {st.available_slots} Slots Open
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Distance & Reachability</span>
              <span className="telemetry-number font-bold text-white text-sm">{st.distance_km} km ({topRescueStation.travel_time_min} mins)</span>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Fast Charge Power</span>
              <span className="font-bold text-amber-400 text-sm flex items-center gap-1">
                <Zap className="w-4 h-4" /> <span className="telemetry-number">{st.max_power_kw} kW DC</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Reliability Score</span>
              <span className="font-bold text-blue-400 text-sm flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> {st.reliability.reliability_score}% Guaranteed
              </span>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-slate-400 text-[10px] block">Parking Availability</span>
              <span className="font-bold text-indigo-400 text-sm">{st.parking_spots.available} Free Spots</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Dismiss
          </button>

          <button
            onClick={() => onConfirmRescue(st.id)}
            className="danger-action w-2/3 py-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Navigation className="w-4 h-4" /> START EMERGENCY NAVIGATION
          </button>
        </div>
      </div>
    </div>
  );
};
