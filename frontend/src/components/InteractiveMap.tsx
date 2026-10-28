import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { EVStation, StationRecommendation } from '../types';
import { Zap, ShieldCheck, ParkingSquare, Sparkles } from 'lucide-react';

const formatDistanceKm = (km: number) => `${Number.isFinite(km) ? km.toFixed(km >= 10 ? 1 : 2) : '0.00'} km`;
const formatEtaText = (minutes: number) => `~${Math.max(1, Math.round(minutes))} mins`;

interface InteractiveMapProps {
  center: { lat: number; lng: number };
  userGpsCoords?: { lat: number; lng: number };
  stations: EVStation[];
  recommendations: StationRecommendation[];
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  onReserveSlot: (stationId: string) => void;
  reservedStationId?: string | null;
  reservationInfo?: {
    reservation_id: string;
    travel_time_min: number;
    waiting_time_min: number;
    assigned_bay: string;
    assigned_parking: string;
    status: 'ready' | 'waiting';
  } | null;
}

const createCustomIcon = (
  color: string,
  distanceKm: number,
  rank?: number,
  isSelected: boolean = false,
  isTopRank: boolean = false,
  isReserved: boolean = false,
  resId?: string
) => {
  const size = isReserved ? 38 : (isSelected ? 36 : (isTopRank ? 32 : 28));
  const glowColor = isReserved || isTopRank ? 'rgba(16, 185, 129, 0.45)' : color;
  const anchorY = Math.round(size / 2);

  const iconHtml = `
    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: all 0.3s ease;">
      <!-- Main Marker Ring -->
      <div style="
        background: rgba(15, 15, 35, 0.95);
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: ${isReserved ? '3px solid #10b981' : (isSelected ? '3px solid #06b6d4' : `2px solid ${color}`)};
        box-shadow: 0 2px 8px ${glowColor};
        color: #ffffff;
        font-weight: 900;
        font-size: 11px;
      ">
        ${isReserved ? '✓' : (rank ? `#${rank}` : `<svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`)}
      </div>
      <!-- Distance Badge Pill / Reserved Pill -->
      <div style="
        margin-top: 3px;
        background: #18181b;
        color: ${isReserved || isTopRank ? '#4ade80' : '#d4d4d8'};
        border: 1px solid ${isReserved || isTopRank ? 'rgba(34, 197, 94, 0.4)' : '#3f3f46'};
        padding: 2px 7px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 900;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      ">
        ${isReserved ? `✓ RESERVED (#${resId || ''})` : formatDistanceKm(distanceKm)}
      </div>
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize: [80, size + 22],
    iconAnchor: [40, anchorY]
  });
};

const evCarIcon = L.divIcon({
  html: `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div style="
        background: #10b981;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      ">
        <span style="font-size: 20px;">⚡</span>
      </div>
      <div style="
        margin-top: 3px;
        background: rgba(15, 15, 35, 0.95);
        color: #f43f5e;
        border: 1px solid rgba(244, 63, 94, 0.5);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 900;
        white-space: nowrap;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
      ">
        YOUR EV
      </div>
    </div>
  `,
  className: 'custom-ev-marker',
  iconSize: [60, 60],
  iconAnchor: [30, 19] // Anchored EXACTLY at the center of the 38px car ring!
});

const createRouteMidpointIcon = (distanceKm: number, travelTimeMin: number) => {
  const html = `
    <div style="
      background: #18181b;
      backdrop-filter: blur(14px);
      border: 1px solid #3f3f46;
      border-radius: 10px;
      padding: 6px 12px;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    ">
      <span style="color: #4ade80;">Direct Route:</span>
      <span style="color: #f4f4f5; font-weight: 700; font-variant-numeric: tabular-nums;">${formatDistanceKm(distanceKm)}</span>
      <span style="color: #94a3b8;">(${formatEtaText(travelTimeMin)})</span>
    </div>
  `;
  return L.divIcon({
    html: html,
    className: 'custom-route-midpoint-icon',
    iconSize: [210, 32],
    iconAnchor: [105, 16]
  });
};

const isValidCoordinate = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const getMapFitPoints = (
  userCoords: { lat: number; lng: number },
  stations: EVStation[],
  recommendations: StationRecommendation[],
  priorityStationId: string | null = null,
): L.LatLngExpression[] => {
  const hasUserPoint = isValidCoordinate(userCoords.lat, userCoords.lng);
  const validRecommendedStations = recommendations
    .map(rec => rec.station)
    .filter(station => isValidCoordinate(station.lat, station.lng));
  const stationSource = validRecommendedStations.length ? validRecommendedStations : stations;
  const uniqueStations = Array.from(new Map(stationSource.map(station => [station.id, station])).values())
    .filter(station => isValidCoordinate(station.lat, station.lng));
  const distanceFromUser = (station: EVStation) => hasUserPoint
    ? L.latLng(userCoords.lat, userCoords.lng).distanceTo([station.lat, station.lng]) / 1000
    : Number.isFinite(station.distance_km) ? station.distance_km : Number.POSITIVE_INFINITY;
  const nearest = uniqueStations
    .map(station => ({ station, distance: distanceFromUser(station) }))
    .sort((a, b) => a.distance - b.distance);
  const nearby = hasUserPoint ? nearest.filter(item => item.distance <= 12) : nearest;
  const priorityStation = priorityStationId
    ? uniqueStations.find(station => station.id === priorityStationId)
      || stations.find(station => station.id === priorityStationId)
    : undefined;
  const priority = priorityStation && isValidCoordinate(priorityStation.lat, priorityStation.lng)
    ? { station: priorityStation, distance: distanceFromUser(priorityStation) }
    : undefined;
  let visibleStations = nearby.slice(0, 5).map(item => item.station);

  if (priority) {
    visibleStations = [priority.station, ...visibleStations.filter(station => station.id !== priority.station.id)].slice(0, 5);
  } else if (visibleStations.length === 0) {
    visibleStations = nearest.slice(0, 5).map(item => item.station);
  }

  const points: L.LatLngExpression[] = [];
  if (hasUserPoint) points.push([userCoords.lat, userCoords.lng]);
  points.push(...visibleStations.map(station => [station.lat, station.lng] as [number, number]));
  return points;
};

const fitMapToRecommendations = (
  map: L.Map,
  userCoords: { lat: number; lng: number },
  stations: EVStation[],
  recommendations: StationRecommendation[],
  priorityStationId: string | null,
) => {
  const points = getMapFitPoints(userCoords, stations, recommendations, priorityStationId);
  if (!points.length) return;

  const padding = map.getSize().x < 600 ? 24 : 48;
  map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom: 14 });
};

const SpatialRecommendationLines: React.FC<{
  userCoords: { lat: number; lng: number };
  recommendations: StationRecommendation[];
}> = ({ userCoords, recommendations }) => {
  if (!isValidCoordinate(userCoords.lat, userCoords.lng)) return null;

  return <>
    {recommendations.slice(0, 5).filter(rec => isValidCoordinate(rec.station.lat, rec.station.lng)).map(rec => (
      <Polyline
        key={`recommendation-link-${rec.station.id}`}
        positions={[[userCoords.lat, userCoords.lng], [rec.station.lat, rec.station.lng]]}
        pathOptions={{
          color: rec.rank === 1 ? '#10b981' : '#94a3b8',
          weight: 2,
          opacity: 0.6,
          dashArray: '6, 6',
        }}
        interactive={false}
      />
    ))}
  </>;
};

const MapAutoFitBounds: React.FC<{
  userCoords: { lat: number; lng: number };
  stations: EVStation[];
  recommendations: StationRecommendation[];
  selectedStationId: string | null;
  reservedStationId: string | null;
}> = ({ userCoords, stations, recommendations, selectedStationId, reservedStationId }) => {
  const map = useMap();

  useEffect(() => {
    fitMapToRecommendations(
      map,
      userCoords,
      stations,
      recommendations,
      selectedStationId || reservedStationId,
    );
  }, [userCoords, stations, recommendations, selectedStationId, reservedStationId, map]);

  return null;
};

const MapViewControls: React.FC<{
  map: L.Map | null;
  stations: EVStation[];
  recommendations: StationRecommendation[];
  userCoords: { lat: number; lng: number };
  selectedStationId: string | null;
  reservedStationId: string | null;
  showRoadOverlay: boolean;
  onToggleRoadOverlay: (value: boolean) => void;
}> = ({ map, stations, recommendations, userCoords, selectedStationId, reservedStationId, showRoadOverlay, onToggleRoadOverlay }) => {
  const fitBounds = () => {
    if (!map) return;
    fitMapToRecommendations(map, userCoords, stations, recommendations, selectedStationId || reservedStationId);
  };

  return (
    <div className="absolute right-4 top-4 z-[500] flex flex-col gap-2">
      <div className="glass-panel map-controls rounded-xl border border-slate-800 p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => map?.zoomIn()}
          aria-label="Zoom in"
          className="map-control-button map-control-icon"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => map?.zoomOut()}
          aria-label="Zoom out"
          className="map-control-button map-control-icon"
        >
          −
        </button>
        <button
          type="button"
          onClick={fitBounds}
          aria-label="Fit all stations"
          className="map-control-button map-control-text"
        >
          Fit
        </button>
        <button
          type="button"
          onClick={() => onToggleRoadOverlay(!showRoadOverlay)}
          aria-label="Toggle road labels"
          className={`map-control-button map-control-text ${showRoadOverlay ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40' : 'bg-slate-900/80 text-slate-300 border-slate-700'}`}
        >
          {showRoadOverlay ? 'Roads' : 'Imagery'}
        </button>
      </div>
    </div>
  );
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center,
  userGpsCoords,
  stations,
  recommendations,
  selectedStationId,
  onSelectStation,
  onReserveSlot,
  reservedStationId = null,
  reservationInfo = null
}) => {
  const [showRoadOverlay, setShowRoadOverlay] = React.useState(true);
  const [mapInstance, setMapInstance] = React.useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  // Target station for routing line: selected station or reserved station or top station if selected
  const activeStationId = selectedStationId || reservedStationId;
  const selectedStationObj = activeStationId ? stations.find(s => s.id === activeStationId) : null;
  const targetStation = selectedStationObj || (reservedStationId ? (stations.length > 0 ? stations[0] : null) : null);
  const targetRec = targetStation ? recommendations.find(r => r.station.id === targetStation.id) : null;

  const startCoords = userGpsCoords || center;

  // Calculate midpoint for route banner
  const midpointLat = targetStation ? (startCoords.lat + targetStation.lat) / 2 : startCoords.lat;
  const midpointLng = targetStation ? (startCoords.lng + targetStation.lng) / 2 : startCoords.lng;

  return (
    <div className="relative w-full h-[650px] min-h-0 lg:h-auto lg:flex-1 rounded-xl overflow-hidden border border-slate-800 shadow-sm">
      <MapContainer
        ref={mapRef}
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ width: '100%', height: '100%', backgroundColor: '#070714' }}
        zoomControl={false}
        attributionControl={false}
        whenReady={() => setMapInstance(mapRef.current)}
      >
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {showRoadOverlay && (
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.9}
          />
        )}

        <MapAutoFitBounds
          userCoords={startCoords}
          stations={stations}
          recommendations={recommendations}
          selectedStationId={selectedStationId}
          reservedStationId={reservedStationId}
        />

        <SpatialRecommendationLines userCoords={startCoords} recommendations={recommendations} />

        {/* User EV Vehicle Position */}
        <Marker position={[startCoords.lat, startCoords.lng]} icon={evCarIcon}>
          <Popup>
            <div className="p-2 space-y-1">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                ⚡ Your EV Telemetry Location
              </h3>
              <p className="text-xs text-slate-300">Live GPS Location Connected</p>
            </div>
          </Popup>
        </Marker>

        {/* Station Markers with Live Distance Pills */}
        {stations.map((st) => {
          const recItem = recommendations.find(r => r.station.id === st.id);
          const rank = recItem ? recItem.rank : undefined;
          const isTop1 = recItem && recItem.rank === 1;
          const isSelected = selectedStationId === st.id;
          const isReserved = reservedStationId === st.id;

          let color = '#10b981';
          if (st.available_slots === 0) color = '#ef4444';
          else if (st.available_slots <= 1) color = '#f59e0b';

          if (isTop1) color = '#22c55e';
          if (isSelected) color = '#f4f4f5';
          if (isReserved) color = '#10b981';

          return (
            <Marker
              key={st.id}
              position={[st.lat, st.lng]}
              icon={createCustomIcon(color, st.distance_km, rank, isSelected, isTop1, isReserved, reservationInfo?.reservation_id)}
              eventHandlers={{
                click: () => onSelectStation(st.id)
              }}
            >
              <Popup>
                <div className="p-2.5 space-y-2.5 min-w-[240px]">
                  {isReserved && reservationInfo && (
                    <div className="bg-emerald-950/90 border border-emerald-500/50 p-2.5 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-black text-emerald-300">
                        <span>✓ ACTIVE RESERVATION</span>
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-emerald-500/30">
                          CODE: {reservationInfo.reservation_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1">
                        <span>Reach: <strong className="telemetry-number text-cyan-300">{reservationInfo.travel_time_min} mins</strong></span>
                        <span>Wait: <strong className="text-amber-300">{reservationInfo.waiting_time_min > 0 ? `${reservationInfo.waiting_time_min} mins` : 'Ready!'}</strong></span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-b border-violet-500/20 pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-violet-300">{st.name}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        📍 <span className="telemetry-number">{formatDistanceKm(st.distance_km)}</span> away • <span className="telemetry-number">{formatEtaText(recItem?.travel_time_min ?? Math.round((st.distance_km / 35) * 60))}</span>
                      </span>
                    </div>
                    {isTop1 && !isReserved && (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/40 rounded-full shrink-0 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-current" /> TOP AI CHOICE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Charger Power</span>
                      <span className="font-extrabold text-slate-100 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" /> <span className="telemetry-number">{st.max_power_kw} kW</span>
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Availability</span>
                      <span className="font-extrabold text-emerald-400">
                        {st.available_slots} / {st.total_slots} Slots
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Reliability</span>
                      <span className="font-extrabold text-indigo-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> {st.reliability.reliability_score}%
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 space-y-0.5">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Parking Spots</span>
                      <span className="font-extrabold text-cyan-400 flex items-center gap-1">
                        <ParkingSquare className="w-3.5 h-3.5 text-cyan-400" /> {st.parking_spots.available} Free
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-xs font-black text-slate-200">
                      <span className="telemetry-number">₹ {st.cost_per_kwh}/kWh</span>
                    </span>
                    <button
                      onClick={() => onReserveSlot(st.id)}
                      className="primary-action px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer"
                    >
                      {isReserved ? '✓ Reserved' : 'Reserve & Navigate'}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Dynamic Glowing Route Polyline - Exact Center Alignment */}
        {targetStation && (
          <>
            <Polyline
              positions={[
                [startCoords.lat, startCoords.lng],
                [targetStation.lat, targetStation.lng]
              ]}
              pathOptions={{
                color: reservedStationId === targetStation.id ? '#10b981' : '#22c55e',
                weight: 5,
                opacity: 0.9,
                dashArray: '8, 12'
              }}
            />
            {/* Midpoint Distance Callout Marker */}
            <Marker
              position={[midpointLat, midpointLng]}
              icon={createRouteMidpointIcon(
                targetStation.distance_km,
                targetRec?.travel_time_min ?? Math.round((targetStation.distance_km / 35) * 60)
              )}
            />
          </>
        )}
      </MapContainer>

      <MapViewControls
        map={mapInstance}
        stations={stations}
        recommendations={recommendations}
        userCoords={startCoords}
        selectedStationId={selectedStationId}
        reservedStationId={reservedStationId}
        showRoadOverlay={showRoadOverlay}
        onToggleRoadOverlay={setShowRoadOverlay}
      />

      {/* Map Legend Bar */}
      <div className="absolute bottom-4 left-4 z-[400] glass-panel map-legend px-4 py-2.5 rounded-xl border border-slate-800 shadow-sm flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="recommendation-link-key" aria-hidden="true"></span>
          <span className="text-slate-300 font-medium">Top 5 recommendation links</span>
        </div>
        {reservedStationId && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-emerald-300 font-black">✓ Reserved</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300 font-bold">#1 AI Rec</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-zinc-400"></span>
          <span className="text-slate-300 font-bold">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-slate-300 font-medium">Low Slots</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-slate-300 font-medium">Full / Offline</span>
        </div>
      </div>
    </div>
  );
};
