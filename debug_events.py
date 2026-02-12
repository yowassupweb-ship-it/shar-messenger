import json
import os

file_path = 'frontend/data/calendar-events.json'
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        events = data.get('events', [])
        print(f"Total events: {len(events)}")
        for e in events:
            print(f"ID: '{e.get('id')}'")
except Exception as e:
    print(f"Error: {e}")
