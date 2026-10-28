import React, { useState } from 'react';
import type { SpatialGraphSummary, StationRecommendation } from '../types';
import { ShieldCheck, Clock, Zap, Battery, HelpCircle, Navigation, ParkingSquare, ChevronDown, ChevronUp, Sparkles, XCircle, CheckCircle2, Share2 } from 'lucide-react';

const formatConnectorTypes = (connectors: string[], powerKw: number) => {
  const hadAtherConnector = connectors.some(connector => /ather/i.test(connector));
  const normalized = connectors.filter(connector => !/ather/i.test(connector));
  const primaryIndex = normalized.findIndex(connector => /(CCS|DC|fast|GB\/T)/i.test(connector));

  if (primaryIndex === -1) {
    if (hadAtherConnector || normalized.length === 0) {
      normalized.unshift(`CCS2 DC Fast (${powerKw}kW)`);
    }
    return normalized.join(', ');
  }

  const primary = normalized[primaryIndex];
  normalized[primaryIndex] = /\([^)]*kW\)/i.test(primary)
    ? primary.replace(/\([^)]*kW\)/i, `(${powerKw}kW)`)
    : `${primary} (${powerKw}kW)`;
  return normalized.join(', ');
};

interface RecommendationCardProps {
  rec: StationRecommendation;
  spatialGraph?: SpatialGraphSummary;
  onReserveSlot: (stationId: string) => void;
  isReserved?: boolean;
  reservationInfo?: {
    reservation_id: string;
    travel_time_min: number;
    waiting_time_min: number;
    assigned_bay: string;
    assigned_parking: string;
    status: 'ready' | 'waiting';
  } | null;
  onCancelReservation?: () => void;
  onCompleteReservation?: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  rec,
  spatialGraph,
  onReserveSlot,
  isReserved = false,
  reservationInfo = null,
  onCancelReservation,
  onCompleteReservation
}) => {
  const [showXaiDetails, setShowXaiDetails] = useState(rec.rank === 1);
  const st = rec.station;
  const xai = rec.xai_explanation;
  const deg = rec.battery_degradation;

  const formattedDistance = `${Number.isFinite(st.distance_km) ? st.distance_km.toFixed(st.distance_km >= 10 ? 1 : 2) : '0.00'} km`;
  const etaText = `~${Math.max(1, Math.round(rec.travel_time_min))} mins`;
  const connectorSummary = formatConnectorTypes(st.connector_types, st.max_power_kw);
  const stationSpatialMetrics = spatialGraph?.station_metrics[st.id];

  const isTopRank = rec.rank === 1;

  return (
    <div className={`glass-card-hover rounded-3xl p-5 border space-y-4 transition-all duration-300 ${
      isReserved
        ? 'reserved-card border-emerald-700 ring-1 ring-emerald-700'
        : isTopRank 
          ? 'recommended-card border-emerald-700' 
          : 'border-slate-800/80 bg-slate-900/60'
    }`}>
      
      {/* Station Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          
          {/* Rank Badge */}
          <div className={`rank-badge w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base ${
            isTopRank
              ? 'rank-badge-primary'
              : 'bg-slate-800/90 text-slate-200 border border-slate-700/80'
          }`}>
            #{rec.rank}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-100 text-base tracking-tight">{st.name}</h3>
              {isReserved && (
                <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 rounded-full flex items-center gap-1 animate-pulse">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ACTIVE RESERVATION
                </span>
              )}
              {!isReserved && isTopRank && (
                <span className="recommendation-badge px-2.5 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 fill-current" /> TOP AI RECOMMENDATION
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {st.address} • <span className="text-violet-400 font-semibold">{st.operator}</span>
            </p>
          </div>
        </div>

        {/* Score Badge */}
        <div className="text-right shrink-0">
          <div className="telemetry-number text-2xl font-bold text-emerald-500 tracking-tight">
            {rec.composite_score}
          </div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Match Score</span>
        </div>
      </div>

      {/* RESERVED HIGHLIGHT BANNER */}
      {isReserved && reservationInfo && (
        <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-2xl space-y-2.5 animate-fade-in text-xs shadow-lg shadow-emerald-950/50">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-extrabold text-emerald-200 text-sm">Slot Reserved Successfully</span>
            </div>
            <div className="bg-slate-900/90 border border-emerald-500/40 px-3 py-1 rounded-xl text-emerald-300 font-mono font-black text-xs">
              CODE: {reservationInfo.reservation_id}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-slate-950/90 p-2.5 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Time to Reach</span>
              <span className="font-black text-cyan-300 text-sm flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> <span className="telemetry-number">~{Math.max(1, Math.round(reservationInfo.travel_time_min))} mins</span>
              </span>
            </div>

            <div className="bg-slate-950/90 p-2.5 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Waiting Time</span>
              {reservationInfo.waiting_time_min > 0 ? (
                <span className="font-black text-amber-300 text-sm flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> {reservationInfo.waiting_time_min} mins
                </span>
              ) : (
                <span className="font-black text-emerald-400 text-sm flex items-center justify-center gap-1 mt-0.5">
                  ⚡ 0 min (Ready)
                </span>
              )}
            </div>

            <div className="bg-slate-950/90 p-2.5 rounded-xl border border-emerald-500/30 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Assigned Slot</span>
              <span className="font-black text-indigo-300 text-xs truncate block mt-0.5">
                {reservationInfo.assigned_bay.split(' ')[0]} / {reservationInfo.assigned_parking.split(' ')[0]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Live Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 space-y-1">
          <span className="text-slate-400 text-[10px] font-semibold uppercase block">Charger Power</span>
          <div className="font-extrabold text-slate-100 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span className="telemetry-number">{st.max_power_kw} kW</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 space-y-1">
          <span className="text-slate-400 text-[10px] font-semibold uppercase block">Distance</span>
          <div className="font-extrabold text-emerald-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="telemetry-number">{formattedDistance} • {etaText}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 space-y-1">
          <span className="text-slate-400 text-[10px] font-semibold uppercase block">Reliability</span>
          <div className="font-extrabold text-blue-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>{st.reliability.reliability_score}%</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 space-y-1">
          <span className="text-slate-400 text-[10px] font-semibold uppercase block">Parking Spots</span>
          <div className="font-extrabold text-indigo-400 flex items-center gap-1.5">
            <ParkingSquare className="w-4 h-4 text-indigo-400" />
            <span>{st.parking_spots.available} Free</span>
          </div>
        </div>

      </div>

      {/* Dynamic Highlights Badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        {xai.highlights.map((h, i) => (
          <span key={i} className="px-3 py-1 text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-xl flex items-center gap-1">
            {h}
          </span>
        ))}
      </div>

      {/* Explainable AI Breakdown Drawer */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          onClick={() => setShowXaiDetails(!showXaiDetails)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            Why this station? (Explainable AI Metrics)
          </span>
          {showXaiDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showXaiDetails && (
          <div className="mt-3 bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs animate-fade-in">
            <p className="text-slate-300 italic font-medium leading-relaxed">
              "{xai.narrative_explanation}"
            </p>

            {/* Feature Contribution Weight Bars */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Multi-Criteria Feature Weight Contribution
              </span>
              {xai.feature_contributions.map((fc, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-200 font-semibold">{fc.feature}</span>
                    <span className="text-slate-400 font-mono font-bold">{fc.value} ({fc.score}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${Math.max(5, fc.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Battery Thermal Advice */}
            <div className="thermal-callout mt-2 p-3 rounded-xl border text-[11px] flex items-start gap-2.5">
              <Battery className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="thermal-callout-title font-bold block">Indian Ambient Thermal Protection:</span>
                <span className="thermal-callout-body">{deg.preservation_advice[0]}</span>
              </div>
            </div>

            {/* PyTorch LSTM Multi-Horizon Demand & Congestion Forecast */}
            <div className="mt-3 temporal-model-panel p-3.5 rounded-xl border text-[11px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-violet-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" /> PyTorch LSTM Congestion & Queue Forecast
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Model: 2-Layer LSTM</span>
              </div>
              <p className="model-data-note">These displayed horizon values are illustrative placeholders; this card is not wired to the forecast API.</p>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block">+20 Mins</span>
                  <span className="font-black text-cyan-300">
                    {Math.round(st.available_slots > 0 ? 35 : 75)}% Occ
                  </span>
                  <span className="text-[9px] text-slate-400 block font-semibold">Queue: {st.available_slots === 0 ? '2 EVs' : '0 EVs'}</span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block">+40 Mins</span>
                  <span className="font-black text-indigo-300">
                    {Math.round(st.available_slots > 0 ? 45 : 85)}% Occ
                  </span>
                  <span className="text-[9px] text-slate-400 block font-semibold">Queue: {st.available_slots === 0 ? '4 EVs' : '1 EV'}</span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block">+60 Mins</span>
                  <span className="font-black text-emerald-300">
                    {Math.round(st.available_slots > 0 ? 25 : 60)}% Occ
                  </span>
                  <span className="text-[9px] text-slate-400 block font-semibold">Queue: {st.available_slots === 0 ? '1 EV' : '0 EVs'}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 spatial-graph-panel p-3.5 rounded-xl border text-[11px] space-y-2">
              <div className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold uppercase tracking-wider text-[10px]">GAT Spatial Graph Topology</span>
              </div>
              <dl className="space-y-1.5">
                <div className="spatial-metric-row">
                  <dt>Model components</dt>
                  <dd>PyTorch GAT module + 2-layer LSTM forecaster; separate paths, no trained checkpoints loaded</dd>
                </div>
                <div className="spatial-metric-row">
                  <dt>Graph topology</dt>
                  <dd>
                    {spatialGraph
                      ? `Coordinate-derived proximity graph • ${spatialGraph.proximity_radius_km} km radius • ${spatialGraph.edge_count} edges`
                      : 'Spatial graph data unavailable'}
                  </dd>
                </div>
                <div className="spatial-metric-row">
                  <dt>Station connectivity</dt>
                  <dd>
                    {stationSpatialMetrics?.hops_from_ev != null
                      ? `${stationSpatialMetrics.hops_from_ev} ${stationSpatialMetrics.hops_from_ev === 1 ? 'hop' : 'hops'} from YOUR EV • ${stationSpatialMetrics.degree} neighbors`
                      : 'No path in the current proximity graph'}
                  </dd>
                </div>
                <div className="spatial-metric-row">
                  <dt>Graph attention edge weight</dt>
                  <dd>
                    {spatialGraph?.attention_available && stationSpatialMetrics && 'gat_attention_weight' in stationSpatialMetrics
                      ? String(stationSpatialMetrics.gat_attention_weight)
                      : 'Unavailable • no trained GAT checkpoint loaded'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="station-card-footer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800/80">
        <div className="min-w-0 text-xs font-medium flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="whitespace-nowrap">
            <span className="text-slate-400">Live Tariff: </span>
            <span className="telemetry-number font-bold text-emerald-400 text-sm">₹{st.cost_per_kwh}/kWh</span>
          </span>
          <span className="min-w-0 break-words">
            <span className="text-slate-400">Connectors: </span>
            <span className="text-slate-200 font-bold">{connectorSummary}</span>
          </span>
        </div>

        {isReserved ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => onCancelReservation && onCancelReservation()}
              className="px-4 py-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-400" /> Cancel Reservation
            </button>

            <button
              onClick={() => onCompleteReservation && onCompleteReservation()}
              className="primary-action px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950 fill-current" /> Complete Charging
            </button>
          </div>
        ) : (
          <button
            onClick={() => onReserveSlot(st.id)}
            className="primary-action whitespace-nowrap px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Navigation className="w-4 h-4 fill-current" /> Reserve & Guide Navigation
          </button>
        )}
      </div>

    </div>
  );
};
