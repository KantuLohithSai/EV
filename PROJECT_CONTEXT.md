# EV Charging Project Context

This is a maintained handoff note for the existing VoltConnect EV Charging dashboard. It records architecture, runtime behavior, key implementation paths, and verification commands. Source files remain the authoritative reference; this document is not a verbatim copy of the repository.

## Project Layout

- `backend/main.py`: FastAPI app, request models, station/search/recommendation/profile/forecast/reservation endpoints, and root metadata.
- `backend/services/openchargemap.py`: OpenChargeMap lookup, India location resolution, synthetic fallback stations, distance calculations, connector normalization, and provider templates.
- `backend/services/recommendation_engine.py`: profile-weighted station ranking. Keep score and ranking behavior stable unless explicitly requested.
- `backend/services/osm_graph.py`: coordinate-derived 5 km Haversine spatial connectivity summary. This is separate from recommendation scoring.
- `backend/models/gat_model.py`: PyTorch GAT module and inference helper.
- `backend/models/lstm_model.py`: two-layer PyTorch LSTM forecast helper.
- `backend/services/user_profiling.py`: default profile names and five objective weight presets.
- `backend/tests/test_system.py`: backend smoke/regression tests, including spatial connectivity.
- `frontend/src/App.tsx`: frontend state, API calls, location/profile selection, modal wiring, footer.
- `frontend/src/components/InteractiveMap.tsx`: Leaflet map, Esri imagery/labels, markers, recommendation lines, and shared initial/Fit viewport logic.
- `frontend/src/components/RecommendationCard.tsx`: station metric cards and Explainable AI panels.
- `frontend/src/components/UserProfileManager.tsx`: profile presets, normalized objective sliders, and live AI score formula.
- `frontend/src/components/UserProfileModal.tsx`: profile modal, reset/save/close actions.
- `frontend/src/index.css`: dark/light theme tokens and shared component styling.
- `frontend/src/types/index.ts`: frontend API contracts.

## Runtime and Commands

Frontend: React 19, TypeScript, Vite, Tailwind CSS, Leaflet/react-leaflet, and lucide-react.

Backend: FastAPI/Pydantic, requests, PyTorch, NumPy, NetworkX, and related scientific packages.

Optional OpenChargeMap credentials are read from `OPEN_CHARGE_MAP_API_KEY` (see `.env.example`). Keep real credentials in an untracked `.env`; do not commit them. Without a configured key or usable API response, the app may use its synthetic fallback stations.

From `frontend/`:

```powershell
npm run dev -- --host 127.0.0.1
npm run build
npm run lint
```

From `backend/`:

```powershell
C:\evcharging-venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
C:\evcharging-venv\Scripts\python.exe tests\test_system.py
```

Vite uses port 5173 by default and selects another port when it is already occupied. The frontend expects its backend at `http://localhost:8000`.

## Data and Recommendation Flow

- Stations are fetched from OpenChargeMap for the active coordinates. If the external response is unavailable or sparse, the backend generates synthetic fallback stations around those coordinates.
- Nominatim is used for location search/reverse geocoding; OSRM is used for driving distances/times with a Haversine fallback.
- `/api/recommendations` accepts coordinates, battery state, profile ID, custom weights, and active locality. It returns the existing recommendation payload plus an additive optional `spatial_graph` summary.
- Recommendation ranking uses the existing profile-weighted distance/time, availability, cost, reliability, and battery-preservation logic. Map viewport filtering does not change recommendation results or ranks.
- The profile UI normalizes its five displayed weights using the same sum normalization as the backend. Reset returns to the `balanced` preset and clears custom overrides; Save & Apply retains its existing modal-close behavior.

## Model and Explainability Status

- A PyTorch GAT module exists and its helper returns attention matrices, but it constructs a fresh randomly initialized model and does not load a trained checkpoint. GAT inference is not wired into recommendation scoring. Do not present its values as trained or learned attention.
- LSTM code defines a two-layer PyTorch forecaster. No trained checkpoint is loaded; short histories use a synthetic baseline. The recommendation card's displayed forecast values are illustrative placeholders and are labeled as such; `/api/forecast/{station_id}` is a separate endpoint.
- `spatial_graph` is a coordinate-derived Haversine proximity graph with a 5 km radius. Its station degree, distance, and hop count are real calculations from supplied coordinates. It does not expose a learned GAT edge weight; the API says attention is unavailable.
- The map draws subtle dashed lines from the EV to the top five valid recommendations and labels them as recommendation links, not learned graph attention edges.

## Map and UI Behavior

- Base imagery and place labels use Esri tile services.
- Initial fitting and the Fit button share a viewport selector: EV plus up to five nearest valid recommendation coordinates within 12 km; if none are within the radius, use the closest valid recommendations. A focused/selected station is kept in view. Invalid coordinates are ignored.
- Dark/Light theme preference is stored in `localStorage` under `ev-dashboard-theme` and defaults to dark.
- The footer attribution currently reads: `Hybrid PyTorch GAT + LSTM Engine • Open Charge Map (OCM) • AFDC & OSM Spatial Datasets • Synthetic EV User Behavior Profiling`.

## Data Attribution Caveat

OpenChargeMap station data and OSM/Nominatim geographic data are used by runtime paths. AFDC is named in the requested presentation attribution but is not currently connected to runtime inference. Synthetic station fallback/profile data is not real provider availability. Do not imply otherwise.

## Recent Verification

The most recent full backend run passed all 8 tests. The frontend `npm run build` passed. `git diff --check` passed. Vite still emits existing unresolved Leaflet image asset warnings for `layers.png`, `layers-2x.png`, and `marker-icon.png`. A VS Code diagnostic has intermittently reported the `UserProfileManager` import unresolved even though the file exists and the TypeScript/Vite production build resolves it successfully.
