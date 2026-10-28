from typing import List, Dict, Any
from services.openchargemap import fetch_open_charge_map_pois
from services.user_profiling import resolve_user_weights, DEFAULT_USER_PROFILES
from models.battery_degradation import calculate_battery_degradation
from services.explainable_ai import generate_xai_explanation
from services.osm_graph import build_spatial_connectivity_summary

def evaluate_and_recommend_stations(
    lat: float,
    lng: float,
    current_soc: float = 45.0,
    target_soc: float = 80.0,
    battery_temp_c: float = 32.0,
    emergency_mode: bool = False,
    user_profile_id: str = "balanced",
    custom_weights: Dict[str, float] = None,
    location_name: str | None = None,
) -> Dict[str, Any]:
    raw_stations = fetch_open_charge_map_pois(
        lat,
        lng,
        distance_km=20.0,
        max_results=14,
        location_name=location_name,
    )
    is_emergency = emergency_mode or (current_soc <= 10.0)

    weights = resolve_user_weights(user_profile_id, custom_weights)
    user_profile_obj = DEFAULT_USER_PROFILES.get(user_profile_id, DEFAULT_USER_PROFILES["balanced"])

    scored_stations = []

    for st in raw_stations:
        dist_km = st["distance_km"]
        travel_time_min = round((dist_km / 35.0) * 60.0, 1)

        reliability_score = st["reliability"]["reliability_score"]
        cost = st["cost_per_kwh"]
        avail_ratio = st["available_slots"] / max(1, st["total_slots"])

        battery_deg = calculate_battery_degradation(
            current_soc=current_soc,
            target_soc=target_soc,
            charger_power_kw=st["max_power_kw"],
            ambient_temp_c=battery_temp_c
        )
        deg_score = battery_deg["degradation_penalty_score"]

        if is_emergency:
            slot_bonus = 50.0 if st["available_slots"] > 0 else -100.0
            power_bonus = 30.0 if st["max_power_kw"] >= 100.0 else 10.0
            dist_penalty = dist_km * 15.0
            rel_bonus = reliability_score * 0.8
            composite_score = max(0.0, min(100.0, 100.0 - dist_penalty + rel_bonus + slot_bonus + power_bonus))
        else:
            travel_utility = max(0.0, 1.0 - (travel_time_min / 30.0)) * 100.0
            avail_utility = avail_ratio * 100.0
            rel_utility = reliability_score
            cost_utility = max(0.0, 1.0 - (cost / 25.0)) * 100.0
            battery_utility = max(0.0, 1.0 - (deg_score / 100.0)) * 100.0

            composite_score = (
                travel_utility * weights.get("travel_time", 0.25) +
                avail_utility * weights.get("wait_time", 0.25) +
                cost_utility * weights.get("cost", 0.15) +
                rel_utility * weights.get("reliability", 0.25) +
                battery_utility * weights.get("battery_preservation", 0.10)
            )
            composite_score = max(0.0, min(100.0, composite_score))

        scored_stations.append({
            "station": st,
            "composite_score": round(composite_score, 1),
            "travel_time_min": travel_time_min,
            "total_delay_min": travel_time_min,
            "battery_degradation": battery_deg
        })

    scored_stations.sort(key=lambda s: s["composite_score"], reverse=True)

    recommendations = []
    for rank_idx, item in enumerate(scored_stations[:6]):
        xai = generate_xai_explanation(
            station=item["station"],
            composite_score=item["composite_score"],
            user_profile_name="EMERGENCY RESCUE MODE" if is_emergency else user_profile_obj["name"],
            weights=weights,
            battery_degradation=item["battery_degradation"],
            rank=rank_idx + 1
        )

        recommendations.append({
            "rank": rank_idx + 1,
            "composite_score": item["composite_score"],
            "station": item["station"],
            "travel_time_min": item["travel_time_min"],
            "total_delay_min": item["total_delay_min"],
            "battery_degradation": item["battery_degradation"],
            "xai_explanation": xai
        })

    return {
        "emergency_rescue_active": is_emergency,
        "current_soc_pct": current_soc,
        "target_soc_pct": target_soc,
        "battery_temp_c": battery_temp_c,
        "user_profile_applied": user_profile_obj["name"],
        "applied_weights": weights,
        "total_stations_evaluated": len(raw_stations),
        "recommendations": recommendations,
        "spatial_graph": build_spatial_connectivity_summary(lat, lng, raw_stations),
    }
