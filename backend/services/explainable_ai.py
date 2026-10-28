from typing import Dict, Any, List

def generate_xai_explanation(
    station: Dict[str, Any],
    composite_score: float,
    user_profile_name: str,
    weights: Dict[str, float],
    battery_degradation: Dict[str, Any],
    rank: int
) -> Dict[str, Any]:
    """
    Generates Explainable AI (XAI) metrics and feature importance breakdowns.
    "Why this station?"
    """
    dist_km = station["distance_km"]
    reliability_pct = station["reliability"]["reliability_score"]
    cost_inr = station["cost_per_kwh"]
    deg_penalty = battery_degradation["degradation_penalty_score"]
    avail_slots = station["available_slots"]

    dist_utility = max(0.0, 1.0 - (dist_km / 15.0)) * weights.get("travel_time", 0.25)
    avail_utility = (avail_slots / max(1, station["total_slots"])) * weights.get("wait_time", 0.25)
    rel_utility = (reliability_pct / 100.0) * weights.get("reliability", 0.25)
    cost_utility = max(0.0, 1.0 - (cost_inr / 25.0)) * weights.get("cost", 0.15)
    battery_utility = max(0.0, 1.0 - (deg_penalty / 100.0)) * weights.get("battery_preservation", 0.10)

    total_u = max(0.001, dist_utility + avail_utility + rel_utility + cost_utility + battery_utility)

    feature_contributions = [
        {"feature": "Short Travel Distance", "score": round((dist_utility / total_u) * 100, 1), "value": f"{dist_km} km", "impact": "Positive" if dist_km < 4.0 else "Neutral"},
        {"feature": "Slot Availability", "score": round((avail_utility / total_u) * 100, 1), "value": f"{avail_slots}/{station['total_slots']} Slots", "impact": "Positive" if avail_slots >= 2 else "Caution"},
        {"feature": "High Reliability Score", "score": round((rel_utility / total_u) * 100, 1), "value": f"{reliability_pct}% uptime", "impact": "Positive" if reliability_pct >= 85 else "Caution"},
        {"feature": "Affordable INR Tariff", "score": round((cost_utility / total_u) * 100, 1), "value": f"₹ {cost_inr}/kWh", "impact": "Positive" if cost_inr < 18.0 else "Neutral"},
        {"feature": "Thermal Battery Protection", "score": round((battery_utility / total_u) * 100, 1), "value": f"{battery_degradation['degradation_impact_level']} wear", "impact": "Positive" if deg_penalty < 30 else "Caution"}
    ]

    highlights = []
    if avail_slots >= 2:
        highlights.append(f"✓ {avail_slots} charging slots open out of {station['total_slots']}")
    if reliability_pct >= 90.0:
        highlights.append(f"✓ Top-tier station reliability ({reliability_pct}% operational score)")
    if dist_km < 3.5:
        highlights.append(f"✓ Nearby location ({dist_km} km away)")
    if cost_inr <= 18.0:
        highlights.append(f"✓ Competitive Indian tariff (₹ {cost_inr}/kWh)")

    narrative = (
        f"Station '{station['name']}' ({station['operator']}) is ranked #{rank} for '{user_profile_name}' with a composite score of {round(composite_score, 1)}/100. "
        f"It offers {avail_slots} available charging slots ({station['max_power_kw']} kW DC Fast). "
        f"Tariff rate is ₹ {cost_inr}/kWh with a charger reliability score of {reliability_pct}%."
    )

    return {
        "rank": rank,
        "composite_score": round(composite_score, 1),
        "narrative_explanation": narrative,
        "highlights": highlights if highlights else ["✓ Recommended station choice with available slots."],
        "feature_contributions": feature_contributions,
        "user_profile_applied": user_profile_name
    }
