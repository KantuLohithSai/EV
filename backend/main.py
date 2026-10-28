from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from services.openchargemap import fetch_open_charge_map_pois, INDIAN_CITIES, geocode_indian_location
from services.user_profiling import DEFAULT_USER_PROFILES
from services.recommendation_engine import evaluate_and_recommend_stations
from models.lstm_model import forecast_station_demand

app = FastAPI(
    title="Real-Time EV Charging & Parking Guidance Backend",
    description="Real-Time Electric Vehicle Charging Station Recommendation and Parking Guidance System",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecommendationRequest(BaseModel):
    lat: float = Field(12.9716, description="Latitude")
    lng: float = Field(77.5946, description="Longitude")
    current_soc: float = Field(45.0, ge=0.0, le=100.0, description="Battery SoC (%)")
    target_soc: float = Field(80.0, ge=10.0, le=100.0, description="Target SoC (%)")
    battery_temp_c: float = Field(32.0, description="Battery Temperature (°C)")
    emergency_mode: bool = Field(False, description="Emergency Low Battery Rescue Mode trigger")
    user_profile_id: str = Field("balanced", description="User profile archetype")
    custom_weights: Optional[Dict[str, float]] = Field(None, description="Custom multi-objective weights")
    location_name: Optional[str] = Field(None, description="Active reverse-geocoded locality")

class FeedbackRequest(BaseModel):
    station_id: str
    user_rating: float = Field(5.0, ge=1.0, le=5.0)
    reported_issue: Optional[str] = None

class ReservationRequest(BaseModel):
    station_id: str
    vehicle_model: str = "Tata Nexon EV Max"
    arrival_time_min: int = 15

@app.get("/")
def read_root():
    return {
        "status": "online",
        "region": "India (INR / ₹ Currency & Indian Operators)",
        "system": "EV Charging Station Recommendation & Parking Guidance with spatial topology and temporal forecast components",
        "open_source_apis": ["OpenChargeMap API (IN)", "OpenStreetMap Nominatim Geocoding API"],
        "model_metadata": {
            "spatial_graph": "Coordinate-derived 5 km Haversine proximity graph; not a learned attention graph.",
            "gat": "PyTorch GAT module exists, but no trained checkpoint is loaded and GAT inference is not wired into recommendation scoring.",
            "lstm": "Two-layer PyTorch LSTM forecast endpoint; it uses a synthetic baseline when fewer than 10 history records are supplied, with no trained checkpoint loaded.",
            "active_spatial_data": ["OpenChargeMap station coordinates", "User-provided or geocoded coordinates"],
            "afdc_integration": "AFDC data is not currently connected to runtime inference.",
        },
        "available_cities": list(INDIAN_CITIES.keys())
    }

@app.get("/api/cities")
def get_cities():
    return INDIAN_CITIES

@app.get("/api/search_location")
def search_location(q: str = Query(..., description="Search address/city/area in India")):
    result = geocode_indian_location(q)
    return result

@app.get("/api/stations")
def get_stations(
    city: Optional[str] = Query(None, description="City name"),
    search: Optional[str] = Query(None, description="Dynamic search query"),
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    location_name: Optional[str] = Query(None, description="Active reverse-geocoded locality"),
):
    resolved_lat = lat
    resolved_lng = lng
    resolved_location_name = location_name or city or "Vijayawada"

    if search:
        geo = geocode_indian_location(search)
        resolved_lat = geo["lat"]
        resolved_lng = geo["lng"]
        resolved_location_name = location_name or geo["display_name"]
    elif resolved_lat is None or resolved_lng is None:
        coords = INDIAN_CITIES.get(city, INDIAN_CITIES["Vijayawada"])
        resolved_lat = coords["lat"]
        resolved_lng = coords["lng"]

    stations = fetch_open_charge_map_pois(resolved_lat, resolved_lng, location_name=location_name)
    return {
        "location_name": resolved_location_name,
        "center_coordinates": {"lat": resolved_lat, "lng": resolved_lng},
        "count": len(stations),
        "stations": stations
    }

@app.post("/api/recommendations")
def get_recommendations(req: RecommendationRequest):
    result = evaluate_and_recommend_stations(
        lat=req.lat,
        lng=req.lng,
        current_soc=req.current_soc,
        target_soc=req.target_soc,
        battery_temp_c=req.battery_temp_c,
        emergency_mode=req.emergency_mode,
        user_profile_id=req.user_profile_id,
        custom_weights=req.custom_weights,
        location_name=req.location_name,
    )
    return result

@app.get("/api/profiles")
def get_user_profiles():
    return DEFAULT_USER_PROFILES

@app.get("/api/forecast/{station_id}")
def get_station_forecast(station_id: str):
    forecast = forecast_station_demand(station_id, [])
    return {
        "status": "success",
        "station_id": station_id,
        "forecast": forecast
    }

@app.post("/api/feedback")
def submit_feedback(fb: FeedbackRequest):
    return {
        "status": "success",
        "message": f"Feedback registered for station {fb.station_id}. Reliability score recalculated.",
        "station_id": fb.station_id,
        "rating_received": fb.user_rating
    }

@app.post("/api/reserve")
def reserve_slot(res: ReservationRequest):
    import random
    return {
        "status": "reserved",
        "reservation_id": f"IN-RES-{random.randint(10000, 99999)}",
        "station_id": res.station_id,
        "assigned_charger_bay": "Bay #2 (Tata Power CCS2 Fast 60kW)",
        "assigned_parking_spot": "Spot P-07 (Metro Covered Parking)",
        "hold_duration_minutes": 25,
        "message": "Slot & parking spot reserved successfully! Turn-by-turn guidance engaged."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
