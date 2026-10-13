"""In-memory exam data shared by all requests. Cleared when the app closes."""
import threading
import time

from .config import EVENT_LIMIT

data_lock = threading.Lock()
exam_events = []
exam_stations = {}


def add_event(payload):
    """Newest first; a replayed id is ignored so a review is never undone."""
    with data_lock:
        if not any(item.get("id") == payload["id"] for item in exam_events):
            exam_events.insert(0, payload)
            del exam_events[EVENT_LIMIT:]


def save_station(payload):
    """One record per room + station; the latest heartbeat replaces the previous one."""
    payload["serverSeenAt"] = int(time.time() * 1000)
    key = f"{payload['roomId']}::{payload['stationId']}"
    with data_lock:
        exam_stations[key] = payload


def snapshot():
    with data_lock:
        events = sorted(exam_events, key=lambda item: item.get("timestamp", 0), reverse=True)
        stations = sorted(
            exam_stations.values(),
            key=lambda item: (item.get("roomId", ""), item.get("stationId", "")),
        )
    return {"events": events, "stations": stations}


def set_reviewed(event_id, reviewed):
    with data_lock:
        for event in exam_events:
            if event.get("id") == event_id:
                event["reviewed"] = reviewed
                return True
    return False
