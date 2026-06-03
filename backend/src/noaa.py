import requests

def get_kp_index():
    url = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
    resp = requests.get(url, timeout=10)
    data = resp.json()
    latest = data[-1]  # último registro
    return {
        "timestamp"    : latest["time_tag"],
        "kp"           : float(latest["Kp"]),
        "a_running"    : latest["a_running"],
        "station_count": latest["station_count"],
    }

def get_kp_forecast():
    """Previsão de Kp para as próximas 24h."""
    url = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
    resp = requests.get(url, timeout=10)
    data = resp.json()[1:]  # pula o header
    return [{"timestamp": d[0], "kp": float(d[1]), "source": d[2]} for d in data]
