import React from 'react';
import type { EVStation } from '../types';
import { AlertCircle, ShieldCheck, Zap, Clock, Check, X, MapPin } from 'lucide-react';

interface ReservationConfirmModalProps {
  isOpen: boolean;
  station: EVStation | null;
  travelTimeMin: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ReservationConfirmModal: React.FC<ReservationConfirmModalProps> = ({
  isOpen,
  station,
  travelTimeMin,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !station) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="glass-panel-heavy w-full max-w-md rounded-3xl p-6 border border-emerald-500/40 shadow-2xl shadow-emerald-500/20 space-y-5 relative">
        
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase block">
              CONFIRMATION REQUIRED
            </span>
            <h2 className="text-lg font-black text-white tracking-tight">
              Confirm Reservation?
            </h2>
          </div>
        </div>

        {/* Station Details summary */}
        <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-slate-100 text-sm">{station.name}</h3>
            <p className="text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{station.address}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Charger Power</span>
              <span className="font-extrabold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400/20" /> <span className="telemetry-number">{station.max_power_kw} kW</span>
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Estimated Travel</span>
              <span className="font-extrabold text-cyan-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {travelTimeMin} mins
              </span>
            </div>
          </div>

          {/* Info Callout */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/30 text-[11px] text-slate-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Once confirmed, your charger bay will be locked for 25 minutes. Other charging hubs will be hidden until you complete or cancel this session.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onCancel}
            className="w-1/2 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 transition-all cursor-pointer text-center"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="primary-action w-1/2 py-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" /> Yes, Confirm & Lock
          </button>
        </div>

      </div>
    </div>
  );
};
