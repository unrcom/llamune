FACILITIES = [
    {
        "id": 1,
        "name": "新宿内科クリニック",
        "type": "hospital",
        "address": "東京都新宿区新宿3-1-1",
        "tel": "03-1234-5678",
        "distance_km": 0.3,
        "open": True,
        "hours": "09:00-18:00",
        "specialties": ["内科", "小児科"]
    },
    {
        "id": 2,
        "name": "東京総合病院",
        "type": "hospital",
        "address": "東京都新宿区西新宿2-5-1",
        "tel": "03-2345-6789",
        "distance_km": 1.2,
        "open": True,
        "hours": "08:30-17:30",
        "specialties": ["内科", "外科", "皮膚科", "耳鼻科"]
    },
    {
        "id": 3,
        "name": "新宿駅前クリニック",
        "type": "hospital",
        "address": "東京都新宿区新宿1-2-3",
        "tel": "03-3456-7890",
        "distance_km": 0.5,
        "open": False,
        "hours": "10:00-19:00",
        "specialties": ["内科", "アレルギー科"]
    },
    {
        "id": 4,
        "name": "マツモトキヨシ 新宿東口店",
        "type": "pharmacy",
        "address": "東京都新宿区新宿3-2-1",
        "tel": "03-4567-8901",
        "distance_km": 0.1,
        "open": True,
        "hours": "09:00-22:00",
        "has_pharmacist": True
    },
    {
        "id": 5,
        "name": "スギ薬局 新宿店",
        "type": "pharmacy",
        "address": "東京都新宿区新宿4-1-5",
        "tel": "03-5678-9012",
        "distance_km": 0.4,
        "open": True,
        "hours": "09:00-21:00",
        "has_pharmacist": True
    },
    {
        "id": 6,
        "name": "調剤薬局ウエルシア 西新宿店",
        "type": "pharmacy",
        "address": "東京都新宿区西新宿1-3-2",
        "tel": "03-6789-0123",
        "distance_km": 0.8,
        "open": False,
        "hours": "09:00-19:00",
        "has_pharmacist": True
    }
]


def get_facilities(facility_type: str = None) -> list:
    if facility_type:
        return [f for f in FACILITIES if f["type"] == facility_type]
    return FACILITIES
