import math
from typing import Dict, Any

def calculate_battery_degradation(
    current_soc: float,
    target_soc: float,
    charger_power_kw: float,
    battery_capacity_kwh: float = 60.0,
    ambient_temp_c: float = 25.0,
    battery_health_soh: float = 96.5
) -> Dict[str, Any]:
    """
    Computes electro-thermal battery degradation penalty score (%) for a charging session.
    
    Factors:
    - C-rate = charger_power_kw / battery_capacity_kwh
    - SoC Stress = exponential penalty above 80% SoC
    - Depth of Discharge (DoD) = target_soc - current_soc
    - Temperature Stress = Arrhenius temperature degradation model
    """
    c_rate = charger_power_kw / max(10.0, battery_capacity_kwh)
    dod = max(0.0, target_soc - current_soc) / 100.0

    # C-rate wear factor (Ultra fast charging > 2C induces lithium plating)
    if c_rate <= 0.5:
        c_rate_wear = 0.001
    elif c_rate <= 1.0:
        c_rate_wear = 0.004
    elif c_rate <= 2.0:
        c_rate_wear = 0.012
    else:
        c_rate_wear = 0.035 * (c_rate ** 1.5)

    # High SoC stress factor (charging from 80% to 100% causes accelerated electrolyte degradation)
    if target_soc > 80.0:
        soc_high_stress = 1.0 + 3.0 * ((target_soc - 80.0) / 20.0) ** 2
    else:
        soc_high_stress = 1.0

    # Temperature factor (Optimum temp: 20°C - 30°C)
    if ambient_temp_c < 10.0:
        temp_stress = 1.8 # Cold charging causes dendrite formation
    elif ambient_temp_c > 35.0:
        temp_stress = 1.5 + (ambient_temp_c - 35.0) * 0.08 # Heat breakdown
    else:
        temp_stress = 1.0

    # Capacity loss estimation per charging cycle (%)
    estimated_capacity_loss_pct = c_rate_wear * dod * soc_high_stress * temp_stress

    # Convert to degradation penalty score (0.0 to 100.0, where 0 is zero degradation penalty, 100 is heavy wear)
    degradation_penalty_score = min(100.0, estimated_capacity_loss_pct * 2500.0)

    # Recommendation advice
    advice = []
    if target_soc > 80.0 and c_rate > 1.5:
        advice.append("Consider capping target SoC at 80% when using Ultra-Fast DC chargers to prevent high-voltage stress.")
    if ambient_temp_c < 10.0:
        advice.append("Enable battery pre-conditioning before fast charging in cold weather.")
    if c_rate <= 1.0:
        advice.append("Standard DC / AC fast charging optimal for battery cell thermal balance.")

    return {
        "c_rate": round(c_rate, 2),
        "dod_ratio": round(dod, 2),
        "temperature_c": ambient_temp_c,
        "estimated_capacity_loss_pct": round(estimated_capacity_loss_pct, 4),
        "degradation_penalty_score": round(degradation_penalty_score, 1),
        "degradation_impact_level": "Minimal" if degradation_penalty_score < 20 else ("Moderate" if degradation_penalty_score < 50 else "High"),
        "preservation_advice": advice if advice else ["Charging parameters are within ideal thermal longevity range."]
    }
