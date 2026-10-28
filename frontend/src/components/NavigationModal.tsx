import React from 'react';
import type { StationRecommendation } from '../types';
import { Navigation, MapPin, CheckCircle, ExternalLink, X, Clock, Zap, XCircle, CheckCircle2 } from 'lucide-react';

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userGpsCoords?: { lat: number; lng: number };
  reservationData: {
    station: StationRecommendation['station'];
    travel_time_min: number;
    waiting_time_min?: number;
    assigned_bay: string;
    assigned_parking: string;
    reservation_id: string;
  } | null;
  onFocusOnMap: (stationId: string) => void;
  onCancelReservation?: () => void;
  onCompleteReservation?: () => void;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  isOpen,
  onClose,
  userGpsCoords,
  reservationData,
  onFocusOnMap,
  onCancelReservation,
  onCompleteReservation
}) => {
  if (!isOpen || !reservationData) return null;

  const st = reservationData.station;
  const waitMin = reservationData.waiting_time_min ?? (st.available_slots === 0 ? 12 : 0);
  
  // Explicitly specify BOTH origin (exact user GPS coordinates) and destination (station coordinates)
  const originQuery = userGpsCoords ? `origin=${userGpsCoords.lat},${userGpsCoords.lng}&` : '';
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&${originQuery}destination=${st.lat},${st.lng}&travelmode=driving`;

  const routeSteps = [
    { distance: "0.2 km", instruction: "Head toward nearest main EV mobility corridor." },
    { distance: `${(st.distance_km * 0.4).toFixed(1)} km`, instruction: "Continue straight on main express transit route." },
    { distance: `${(st.distance_km * 0.4).toFixed(1)} km`, instruction: `Turn towards ${st.operator} Hub Entry.` },
    { distance: "100 m", instruction: `Arrive at ${st.name} — Proceed to ${reservationData.assigned_bay}.` }
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel-heavy w-full max-w-xl rounded-xl p-6 border border-slate-800 shadow-sm space-y-5 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-xl bg-emerald-600 text-emerald-950">
            <Navigation className="w-7 h-7 fill-current animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
              RESERVATION & NAVIGATION ACTIVE
            </span>
            <h2 className="text-xl font-black text-white mt-0.5 tracking-tight">
              {st.name}
            </h2>
            <p className="text-xs text-slate-400 font-medium">{st.address} • {st.operator}</p>
          </div>
        </div>

        <div className="bg-slate-950/90 p-4 rounded-2xl border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>4-DIGIT CODE: <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-emerald-500/40">{reservationData.reservation_id}</strong></span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
              25 Min Hold Guarantee
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Assigned Bay</span>
              <span className="font-extrabold text-slate-100 flex items-center gap-1 mt-0.5 text-[11px] truncate">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {reservationData.assigned_bay.split(' ')[0]}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Time to Reach</span>
              <span className="font-extrabold text-cyan-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> <span className="telemetry-number">{reservationData.travel_time_min} mins</span>
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Waiting Time</span>
              {waitMin > 0 ? (
                <span className="font-extrabold text-amber-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> {waitMin} mins
                </span>
              ) : (
                <span className="font-extrabold text-emerald-400 flex items-center gap-1 mt-0.5">
                  ⚡ Ready Now
                </span>
              )}
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Tariff Rate</span>
              <span className="telemetry-number font-extrabold text-emerald-400 text-sm mt-0.5 block">₹ {st.cost_per_kwh}/kWh</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <h4 className="font-extrabold text-slate-200 flex items-center gap-1.5 uppercase text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Turn-by-Turn Driving Route:
          </h4>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2 max-h-36 overflow-y-auto">
            {routeSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-[11px] border-b border-slate-900 last:border-0 pb-1.5 last:pb-0">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-grow">
                  <span className="text-slate-200 font-medium block">{step.instruction}</span>
                </div>
                <span className="telemetry-number text-slate-500 font-mono text-[10px] shrink-0">{step.distance}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-action w-full sm:w-1/2 py-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <ExternalLink className="w-4 h-4" /> Open Exact Route on Google Maps
            </a>

            <button
              onClick={() => {
                onFocusOnMap(st.id);
                onClose();
              }}
              className="secondary-action w-full sm:w-1/2 py-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-400" /> Focus Station on Map
            </button>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-800/80 pt-3">
            <button
              onClick={() => {
                onCancelReservation && onCancelReservation();
                onClose();
              }}
              className="danger-action w-1/2 py-2.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-400" /> Cancel Reservation
            </button>

            <button
              onClick={() => {
                onCompleteReservation && onCompleteReservation();
                onClose();
              }}
              className="primary-action w-1/2 py-2.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950 fill-current" /> Complete Charging
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
