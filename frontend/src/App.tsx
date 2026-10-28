import { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { InteractiveMap } from './components/InteractiveMap';
import { RecommendationCard } from './components/RecommendationCard';
import { EmergencyRescueModal } from './components/EmergencyRescueModal';
import { UserProfileManager } from './components/UserProfileManager';
import { NavigationModal } from './components/NavigationModal';
import { ReservationConfirmModal } from './components/ReservationConfirmModal';
import { UserProfileModal } from './components/UserProfileModal';

import type {
  EVStation,
  RecommendationResponse,
  UserProfile
} from './types';

import {
  MapPin,
  RefreshCw,
  Sparkles,
  Navigation,
  Zap,
  ShieldCheck,
  ParkingSquare
} from 'lucide-react';

const BACKEND_URL = "http://localhost:8000";

const formatLocationLabel = (input: string) => {
  if (!input) return 'Vijayawada, Andhra Pradesh, India';
  const cleaned = input.replace(/\s+,\s+/g, ',').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Vijayawada, Andhra Pradesh, India';
  return cleaned.length > 80 ? cleaned.split(',').slice(0, 3).join(', ') : cleaned;
};

const INDIAN_METRO_COORDS: Record<string, { lat: number; lng: number }> = {
  "Vijayawada": { lat: 16.5062, lng: 80.6480 },
  "Bengaluru": { lat: 12.9716, lng: 77.5946 },
  "New Delhi / NCR": { lat: 28.6139, lng: 77.2090 },
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Chennai": { lat: 13.0827, lng: 80.2707 },
  "Pune": { lat: 18.5204, lng: 73.8567 },
  "Kolkata": { lat: 22.5726, lng: 88.3639 },
  "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "Jaipur": { lat: 26.9124, lng: 75.7873 },
  "Kochi": { lat: 9.9312, lng: 76.2673 }
};

export default function App() {
  const [currentCity, setCurrentCity] = useState("Vijayawada");
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('ev-dashboard-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [activeLocationName, setActiveLocationName] = useState("Detecting your GPS location...");
  const [center, setCenter] = useState(INDIAN_METRO_COORDS["Vijayawada"]);
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number }>(INDIAN_METRO_COORDS["Vijayawada"]);
  const [currentSoc, setCurrentSoc] = useState(45);
  const [targetSoc] = useState(80);
  const [batteryTemp] = useState(32);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("balanced");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<'map' | 'profiles'>('map');
  const [reservedStationId, setReservedStationId] = useState<string | null>(null);
  const [reservationInfo, setReservationInfo] = useState<{
    reservation_id: string;
    travel_time_min: number;
    waiting_time_min: number;
    assigned_bay: string;
    assigned_parking: string;
    status: 'ready' | 'waiting';
  } | null>(null);

  const [stations, setStations] = useState<EVStation[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({});
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const loadRequestId = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ev-dashboard-theme', theme);
    } catch {}
  }, [theme]);

  const [navModalOpen, setNavModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingStation, setPendingStation] = useState<EVStation | null>(null);
  const [pendingTravelTime, setPendingTravelTime] = useState<number>(0);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeNavData, setActiveNavData] = useState<{
    station: EVStation;
    travel_time_min: number;
    waiting_time_min?: number;
    assigned_bay: string;
    assigned_parking: string;
    reservation_id: string;
  } | null>(null);

  useEffect(() => {
    handleDetectGPSLocation();
  }, []);

  useEffect(() => {
    loadData(center.lat, center.lng);
  }, [center, activeLocationName, currentSoc, emergencyMode, selectedProfileId, customWeights]);

  const handleDetectGPSLocation = () => {
    if ('geolocation' in navigator) {
      setLoading(true);
      setGpsNotice("📡 Detecting your live GPS location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const userCoords = { lat: userLat, lng: userLng };
          setUserGpsCoords(userCoords);
          setCenter(userCoords);
          setSelectedStationId(null);

          try {
            const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`);
            if (revRes.ok) {
              const revData = await revRes.json();
              const displayName = formatLocationLabel(revData.display_name || `GPS: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);
              setActiveLocationName(displayName);
              setGpsNotice(`📍 Located at: ${displayName.split(',')[0].trim()}! Showing nearest stations.`);
            } else {
              setActiveLocationName(`GPS: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);
              setGpsNotice("📍 GPS location acquired! Showing nearest stations.");
            }
          } catch (e) {
            setActiveLocationName(`GPS: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);
            setGpsNotice("📍 GPS location acquired! Showing nearest stations.");
          }

          setTimeout(() => setGpsNotice(null), 5000);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setGpsNotice("⚠️ Location permission blocked. Showing Vijayawada EV Hubs.");
          setTimeout(() => setGpsNotice(null), 5000);
          setCenter(INDIAN_METRO_COORDS["Vijayawada"]);
          setUserGpsCoords(INDIAN_METRO_COORDS["Vijayawada"]);
          setActiveLocationName("Vijayawada, Andhra Pradesh, India");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setCenter(INDIAN_METRO_COORDS["Vijayawada"]);
      setUserGpsCoords(INDIAN_METRO_COORDS["Vijayawada"]);
      setActiveLocationName("Vijayawada, Andhra Pradesh, India");
    }
  };

  const loadData = async (lat: number, lng: number) => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    try {
      const locationQuery = encodeURIComponent(activeLocationName);
      const stationsRes = await fetch(`${BACKEND_URL}/api/stations?lat=${lat}&lng=${lng}&location_name=${locationQuery}`);
      let loadedStations: EVStation[] = [];
      if (stationsRes.ok) {
        const data = await stationsRes.json();
        loadedStations = data.stations || [];
      }

      const recRes = await fetch(`${BACKEND_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: lat,
          lng: lng,
          current_soc: currentSoc,
          target_soc: targetSoc,
          battery_temp_c: batteryTemp,
          emergency_mode: emergencyMode,
          user_profile_id: selectedProfileId,
          custom_weights: Object.keys(customWeights).length > 0 ? customWeights : undefined,
          location_name: activeLocationName
        })
      });
      let loadedRecommendations: RecommendationResponse | null = null;
      if (recRes.ok) {
        loadedRecommendations = await recRes.json();
      }

      const profilesRes = await fetch(`${BACKEND_URL}/api/profiles`);
      if (profilesRes.ok) {
        const pData = await profilesRes.json();
        if (requestId === loadRequestId.current) setProfiles(pData);
      }

      if (requestId === loadRequestId.current) {
        const recommendedStations = loadedRecommendations?.recommendations.map(rec => rec.station) || [];
        const canonicalById = new Map(recommendedStations.map(station => [station.id, station]));
        const reconciledStations = loadedStations.map(station => canonicalById.get(station.id) || station);
        const existingIds = new Set(reconciledStations.map(station => station.id));
        recommendedStations.forEach(station => {
          if (!existingIds.has(station.id)) reconciledStations.push(station);
        });
        setStations(reconciledStations);
        setRecommendations(loadedRecommendations);
      }
    } catch (err) {
      console.warn("Backend connection notice.", err);
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  };

  const handleCitySelect = (cityName: string) => {
    setCurrentCity(cityName);
    setActiveLocationName(`${cityName}, India`);
    const coords = INDIAN_METRO_COORDS[cityName] || INDIAN_METRO_COORDS["Vijayawada"];
    setCenter(coords);
    setUserGpsCoords(coords);
    setSelectedStationId(null);
  };

  const handleSearchLocation = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setGpsNotice(`🔍 AI resolving location for "${query}"...`);
    try {
      const searchRes = await fetch(`${BACKEND_URL}/api/search_location?q=${encodeURIComponent(query.trim())}`);
      if (searchRes.ok) {
        const geo = await searchRes.json();
        if (geo.found) {
          const newCoords = { lat: geo.lat, lng: geo.lng };
          const searchedPlace = formatLocationLabel(geo.display_name).split(',')[0].trim();
          setCurrentCity(searchedPlace);
          setActiveLocationName(formatLocationLabel(geo.display_name));
          setCenter(newCoords);
          setUserGpsCoords(newCoords);
          setSelectedStationId(null);
          setGpsNotice(`📍 AI Location Found: ${searchedPlace}! Updated nearest charging stations.`);
          setTimeout(() => setGpsNotice(null), 6000);

        }
      }
    } catch (e) {
      console.warn("Location search failed", e);
      setGpsNotice("⚠️ Location search notice. Showing default location.");
      setTimeout(() => setGpsNotice(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReserve = (stationId: string) => {
    if (reservedStationId === stationId) {
      setNavModalOpen(true);
      return;
    }

    const targetStation = stations.find(s => s.id === stationId);
    if (!targetStation) return;

    const recObj = recommendations?.recommendations.find(r => r.station.id === stationId);
    const travelMin = recObj ? recObj.travel_time_min : Math.round((targetStation.distance_km / 35.0) * 60);

    setPendingStation(targetStation);
    setPendingTravelTime(travelMin);
    setConfirmModalOpen(true);
  };

  const handleConfirmReservation = async () => {
    if (!pendingStation) return;
    const stationId = pendingStation.id;

    setActiveTab('map');
    setSelectedStationId(stationId);
    setCenter({ lat: pendingStation.lat, lng: pendingStation.lng });
    setConfirmModalOpen(false);

    try {
      const res = await fetch(`${BACKEND_URL}/api/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station_id: stationId, vehicle_model: 'Tata Nexon EV Max', arrival_time_min: 15 })
      });

      if (res.ok && pendingStation) {
        const data = await res.json();
        const recObj = recommendations?.recommendations.find(r => r.station.id === stationId);
        const travelMin = recObj ? recObj.travel_time_min : Math.round((pendingStation.distance_km / 35.0) * 60);
        const waitMin = data.waiting_time_min ?? (pendingStation.available_slots === 0 ? Math.floor(5 + Math.random() * 20) : 0);
        const status = waitMin > 0 ? 'waiting' : 'ready';

        setReservedStationId(stationId);
        setReservationInfo({
          reservation_id: data.reservation_id,
          travel_time_min: travelMin,
          waiting_time_min: waitMin,
          assigned_bay: data.assigned_charger_bay,
          assigned_parking: data.assigned_parking_spot,
          status
        });

        setActiveNavData({
          station: pendingStation,
          travel_time_min: travelMin,
          waiting_time_min: waitMin,
          assigned_bay: data.assigned_charger_bay,
          assigned_parking: data.assigned_parking_spot,
          reservation_id: data.reservation_id
        });
        setNavModalOpen(true);
        setGpsNotice(`⚡ Reservation confirmed! Code: ${data.reservation_id}. Remaining stations hidden.`);
        setTimeout(() => setGpsNotice(null), 6000);
      }
    } catch (err) {
      if (pendingStation) {
        const recObj = recommendations?.recommendations.find(r => r.station.id === stationId);
        const travelMin = recObj ? recObj.travel_time_min : Math.round((pendingStation.distance_km / 35.0) * 60);
        const waitMin = pendingStation.available_slots === 0 ? Math.floor(5 + Math.random() * 20) : 0;
        const resId = `${Math.floor(1000 + Math.random() * 9000)}`;

        setReservedStationId(stationId);
        setReservationInfo({
          reservation_id: resId,
          travel_time_min: travelMin,
          waiting_time_min: waitMin,
          assigned_bay: "Bay #2 (Tata Power CCS2 60kW)",
          assigned_parking: "Spot P-07 (Metro Covered)",
          status: waitMin > 0 ? 'waiting' : 'ready'
        });

        setActiveNavData({
          station: pendingStation,
          travel_time_min: travelMin,
          waiting_time_min: waitMin,
          assigned_bay: "Bay #2 (Tata Power CCS2 60kW)",
          assigned_parking: "Spot P-07 (Metro Covered)",
          reservation_id: resId
        });
        setNavModalOpen(true);
        setGpsNotice(`⚡ Reservation confirmed! Code: ${resId}. Remaining stations hidden.`);
        setTimeout(() => setGpsNotice(null), 6000);
      }
    }
  };

  const handleCancelReservation = () => {
    setReservedStationId(null);
    setReservationInfo(null);
    setActiveNavData(null);
    setGpsNotice("❌ Reservation cancelled. Restored all charging hubs.");
    setTimeout(() => setGpsNotice(null), 5000);
  };

  const handleCompleteReservation = () => {
    setReservedStationId(null);
    setReservationInfo(null);
    setActiveNavData(null);
    setGpsNotice("✅ Charging completed successfully! Restored all charging hubs.");
    setTimeout(() => setGpsNotice(null), 5000);
  };

  const handleFocusStationOnMap = (stationId: string) => {
    setActiveTab('map');
    setSelectedStationId(stationId);
    const targetStation = stations.find(s => s.id === stationId);
    if (targetStation) {
      setCenter({ lat: targetStation.lat, lng: targetStation.lng });
    }
  };

  const filteredRecommendations = useMemo(() => {
    if (!recommendations) return [];
    let list = recommendations.recommendations;

    if (selectedFilter === 'fast') {
      list = list.filter(r => r.station.max_power_kw >= 50.0);
    } else if (selectedFilter === 'available') {
      list = list.filter(r => r.station.available_slots > 0);
    } else if (selectedFilter === 'reliable') {
      list = list.filter(r => r.station.reliability.reliability_score >= 90.0);
    }

    return list;
  }, [recommendations, selectedFilter]);

  const displayedStations = useMemo(() => {
    if (reservedStationId) {
      return stations.filter(s => s.id === reservedStationId);
    }
    return stations;
  }, [stations, reservedStationId]);

  const displayedRecommendations = useMemo(() => {
    if (reservedStationId) {
      return filteredRecommendations.filter(r => r.station.id === reservedStationId);
    }
    return filteredRecommendations;
  }, [filteredRecommendations, reservedStationId]);

  const totalAvailableSlots = useMemo(() => {
    return stations.reduce((acc, s) => acc + s.available_slots, 0);
  }, [stations]);

  const avgReliability = useMemo(() => {
    if (!stations.length) return 0;
    const total = stations.reduce((acc, s) => acc + s.reliability.reliability_score, 0);
    return Math.round(total / stations.length);
  }, [stations]);

  const topRescueRec = (emergencyMode || currentSoc <= 10) && recommendations && recommendations.recommendations.length > 0
    ? recommendations.recommendations[0]
    : null;

  return (
    <div className="dashboard-root min-h-screen font-sans pb-16 flex flex-col">
      <Header
        theme={theme}
        onThemeToggle={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
        currentCity={currentCity}
        onCityChange={handleCitySelect}
        onSearchLocation={handleSearchLocation}
        onDetectLocation={handleDetectGPSLocation}
        emergencyMode={emergencyMode}
        onToggleEmergency={setEmergencyMode}
        currentSoc={currentSoc}
        onSocChange={setCurrentSoc}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        selectedProfile={selectedProfileId}
        onProfileSelect={setSelectedProfileId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenProfileModal={() => setProfileModalOpen(true)}
      />

      {gpsNotice && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] bg-slate-900 border border-emerald-500/50 text-emerald-300 font-semibold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <Navigation className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-xs">{gpsNotice}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 mt-6 w-full flex-grow space-y-6">
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="glass-panel-heavy p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Charging Hubs</span>
              <span className="telemetry-number text-lg font-bold text-slate-100">{displayedStations.length} {reservedStationId ? 'Locked' : 'Active'}</span>
            </div>
          </div>

          <div className="glass-panel-heavy p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ParkingSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Free Slots</span>
              <span className="telemetry-number text-lg font-bold text-cyan-400">{totalAvailableSlots} Open</span>
            </div>
          </div>

          <div className="glass-panel-heavy p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Avg Uptime</span>
              <span className="telemetry-number text-lg font-bold text-blue-400">{avgReliability}% Rating</span>
            </div>
          </div>

          <div className="glass-panel-heavy p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-bold uppercase block">Active Profile</span>
              <span className="text-xs font-black text-indigo-300 leading-tight block max-w-[150px]" title={recommendations?.user_profile_applied || 'Balanced'}>
                {recommendations?.user_profile_applied || 'Balanced'}
              </span>
            </div>
          </div>
        </div>

        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <div className="lg:col-span-7 flex flex-col gap-4 lg:h-[700px]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 truncate max-w-md">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{activeLocationName}</span>
                </h2>
                <button
                  onClick={() => loadData(center.lat, center.lng)}
                  className="secondary-action px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Telemetry
                </button>
              </div>

              <InteractiveMap
                center={center}
                userGpsCoords={userGpsCoords}
                stations={displayedStations}
                recommendations={displayedRecommendations}
                selectedStationId={selectedStationId}
                onSelectStation={handleFocusStationOnMap}
                onReserveSlot={handleRequestReserve}
                reservedStationId={reservedStationId}
                reservationInfo={reservationInfo}
              />
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4 lg:h-[700px] min-h-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  {reservedStationId ? 'Active Reserved Station (1)' : `Nearest Recommended Charging Hubs (${displayedRecommendations.length})`}
                </h2>
              </div>

              <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
                {displayedRecommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.station.id}
                    rec={rec}
                    spatialGraph={recommendations?.spatial_graph}
                    onReserveSlot={handleRequestReserve}
                    isReserved={reservedStationId === rec.station.id}
                    reservationInfo={reservedStationId === rec.station.id ? reservationInfo : null}
                    onCancelReservation={handleCancelReservation}
                    onCompleteReservation={handleCompleteReservation}
                  />
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'profiles' && (
          <UserProfileManager
            profiles={profiles}
            selectedProfileId={selectedProfileId}
            onSelectProfile={setSelectedProfileId}
            customWeights={customWeights}
            onWeightChange={setCustomWeights}
          />
        )}
      </main>

      <ReservationConfirmModal
        isOpen={confirmModalOpen}
        station={pendingStation}
        travelTimeMin={pendingTravelTime}
        onConfirm={handleConfirmReservation}
        onCancel={() => setConfirmModalOpen(false)}
      />

      <NavigationModal
        isOpen={navModalOpen}
        onClose={() => setNavModalOpen(false)}
        userGpsCoords={userGpsCoords}
        reservationData={activeNavData}
        onFocusOnMap={handleFocusStationOnMap}
        onCancelReservation={handleCancelReservation}
        onCompleteReservation={handleCompleteReservation}
      />

      <EmergencyRescueModal
        isOpen={emergencyMode || currentSoc <= 10}
        onClose={() => setEmergencyMode(false)}
        topRescueStation={topRescueRec}
        currentSoc={currentSoc}
        onConfirmRescue={(stId) => {
          handleRequestReserve(stId);
          setEmergencyMode(false);
        }}
      />

      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        onSelectProfile={setSelectedProfileId}
        customWeights={customWeights}
        onWeightChange={setCustomWeights}
      />

      <footer className="mt-12 px-4 text-center text-xs text-slate-500 border-t border-slate-900 pt-6">
        <p>VoltConnect AI — Real-Time Electric Vehicle Charging Station Recommendation & Parking Guidance</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 break-words">
          Hybrid PyTorch GAT + LSTM Engine • Open Charge Map (OCM) • AFDC & OSM Spatial Datasets • Synthetic EV User Behavior Profiling
        </p>
      </footer>
    </div>
  );
}
