import threading
import time
from .config import EVENT_LIMIT
data_lock = threading.Lock()
exam_events = []
exam_stations = {}
DEFAULT_THRESHOLDS = {'noFaceSeconds': 5, 'multipleFacesSeconds': 2, 'headTurnSeconds': 3, 'headPoseSeconds': 6, 'gazeAwaySeconds': 5, 'cooldownSeconds': 12}
room_settings = {'storeSnapshots': False, 'requireConsent': True, 'thresholds': dict(DEFAULT_THRESHOLDS)}

def _sanitize_thresholds(value):
    if not isinstance(value, dict):
        return None
    cleaned = dict(DEFAULT_THRESHOLDS)
    for key in DEFAULT_THRESHOLDS:
        raw = value.get(key)
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            continue
        if 1 <= float(raw) <= 60:
            cleaned[key] = int(round(float(raw)))
    return cleaned

def add_event(payload):
    with data_lock:
        if not any((item.get('id') == payload['id'] for item in exam_events)):
            exam_events.insert(0, payload)
            del exam_events[EVENT_LIMIT:]

def save_station(payload):
    payload['serverSeenAt'] = int(time.time() * 1000)
    key = f"{payload['roomId']}::{payload['stationId']}"
    with data_lock:
        exam_stations[key] = payload

def remove_station(room_id, station_id):
    key = f'{room_id}::{station_id}'
    with data_lock:
        return exam_stations.pop(key, None) is not None

def snapshot():
    with data_lock:
        events = sorted(exam_events, key=lambda item: item.get('timestamp', 0), reverse=True)
        stations = sorted(exam_stations.values(), key=lambda item: (item.get('roomId', ''), item.get('stationId', '')))
    return {'events': events, 'stations': stations}

def get_settings():
    with data_lock:
        return {'storeSnapshots': room_settings['storeSnapshots'], 'requireConsent': room_settings['requireConsent'], 'thresholds': dict(room_settings['thresholds'])}

def save_settings(payload):
    if not isinstance(payload, dict):
        return get_settings()
    with data_lock:
        if 'storeSnapshots' in payload:
            room_settings['storeSnapshots'] = bool(payload.get('storeSnapshots'))
        if 'requireConsent' in payload:
            room_settings['requireConsent'] = bool(payload.get('requireConsent'))
        if 'thresholds' in payload:
            cleaned = _sanitize_thresholds(payload.get('thresholds'))
            if cleaned is not None:
                room_settings['thresholds'] = cleaned
        return {'storeSnapshots': room_settings['storeSnapshots'], 'requireConsent': room_settings['requireConsent'], 'thresholds': dict(room_settings['thresholds'])}
VALID_VERDICTS = ('confirmed', 'false_alarm')

def set_reviewed(event_id, reviewed, verdict=None):
    with data_lock:
        for event in exam_events:
            if event.get('id') == event_id:
                event['reviewed'] = reviewed
                if verdict in VALID_VERDICTS:
                    event['verdict'] = verdict
                elif not reviewed:
                    event.pop('verdict', None)
                return True
    return False
