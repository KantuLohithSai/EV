from typing import Dict, Any

DEFAULT_USER_PROFILES = {
    "balanced": {
        "id": "balanced",
        "name": "Tata Nexon / MG ZS EV Commuter",
        "description": "Harmonious balance between charging speed, rupee cost (₹/kWh), reliability, and battery thermal protection.",
        "weights": {
            "travel_time": 0.25,
            "wait_time": 0.25,
            "cost": 0.20,
            "reliability": 0.20,
            "battery_preservation": 0.10
        }
    },
    "fast_transit": {
        "id": "fast_transit",
        "name": "Highway / Express Transit (Mahindra XUV400 / Ioniq 5)",
        "description": "Prioritizes high power DC Fast Chargers (120kW - 180kW) and minimal total travel + wait time.",
        "weights": {
            "travel_time": 0.40,
            "wait_time": 0.40,
            "cost": 0.05,
            "reliability": 0.10,
            "battery_preservation": 0.05
        }
    },
    "budget_saver": {
        "id": "budget_saver",
        "name": "Budget Saver (Lowest ₹ / kWh & Free Parking)",
        "description": "Prioritizes lowest tariff rates (₹ 14-16/kWh) and low parking fees.",
        "weights": {
            "travel_time": 0.15,
            "wait_time": 0.15,
            "cost": 0.50,
            "reliability": 0.10,
            "battery_preservation": 0.10
        }
    },
    "battery_care": {
        "id": "battery_care",
        "name": "Indian Thermal Battery Protection (High Ambient 38°C+ Care)",
        "description": "Protects LiFePO4 / NMC battery cell chemistry from thermal degradation under high ambient Indian heat.",
        "weights": {
            "travel_time": 0.15,
            "wait_time": 0.15,
            "cost": 0.10,
            "reliability": 0.25,
            "battery_preservation": 0.35
        }
    }
}

def resolve_user_weights(profile_id: str, custom_weights: Dict[str, float] = None) -> Dict[str, float]:
    """Resolves objective weights for multi-criteria recommendation scoring."""
    if custom_weights:
        total = sum(custom_weights.values())
        if total > 0:
            return {k: round(v / total, 3) for k, v in custom_weights.items()}
            
    profile = DEFAULT_USER_PROFILES.get(profile_id, DEFAULT_USER_PROFILES["balanced"])
    return profile["weights"]
