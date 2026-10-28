from typing import Dict, Any, List

def compute_charger_reliability_score(
    historical_uptime_pct: float,
    recent_fault_count: int,
    user_ratings: List[float],
    days_since_last_maintenance: int,
    is_online: bool
) -> Dict[str, Any]:
    """
    Computes a synthesized 0-100% Reliability Score for a charging station/connector.
    
    Weights:
    - Operational status (Offline = immediate cap)
    - Uptime history: 40%
    - Fault history: 25%
    - User ratings: 20%
    - Maintenance freshness: 15%
    """
    if not is_online:
        return {
            "reliability_score": 0.0,
            "reliability_grade": "F (Offline)",
            "is_operational": False,
            "status_details": "Station connector currently offline / reported out of service"
        }

    # 1. Historical Uptime score
    uptime_score = max(0.0, min(100.0, historical_uptime_pct))

    # 2. Fault score (0 faults = 100, 5+ faults = 0)
    fault_score = max(0.0, 100.0 - recent_fault_count * 20.0)

    # 3. User ratings score (1.0 - 5.0 scale to 0-100)
    if user_ratings and len(user_ratings) > 0:
        avg_rating = sum(user_ratings) / len(user_ratings)
        user_score = (avg_rating / 5.0) * 100.0
    else:
        avg_rating = 4.2
        user_score = 84.0

    # 4. Maintenance freshness score (decay after 30 days)
    if days_since_last_maintenance <= 14:
        maint_score = 100.0
    elif days_since_last_maintenance <= 60:
        maint_score = max(50.0, 100.0 - (days_since_last_maintenance - 14) * 1.2)
    else:
        maint_score = 40.0

    # Weighted sum
    final_score = (
        uptime_score * 0.40 +
        fault_score * 0.25 +
        user_score * 0.20 +
        maint_score * 0.15
    )
    final_score = round(max(0.0, min(100.0, final_score)), 1)

    if final_score >= 90.0:
        grade = "A+ (Excellent)"
    elif final_score >= 80.0:
        grade = "A (Highly Reliable)"
    elif final_score >= 70.0:
        grade = "B (Moderate)"
    elif final_score >= 50.0:
        grade = "C (Fair)"
    else:
        grade = "D (High Failure Risk)"

    return {
        "reliability_score": final_score,
        "reliability_grade": grade,
        "is_operational": True,
        "metrics_breakdown": {
            "uptime_history_pct": uptime_score,
            "fault_score": fault_score,
            "user_rating_avg": round(avg_rating, 1),
            "days_since_maintenance": days_since_last_maintenance
        }
    }
