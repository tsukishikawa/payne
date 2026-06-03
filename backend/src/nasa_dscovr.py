# NASA DSCOVR — vento solar em tempo real
import requests

def get_solar_wind():
    """Dados do DSCOVR — atualizados a cada 1 minuto."""
    url = "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json"
    resp = requests.get(url, timeout=10)
    data = resp.json()
    # Última leitura: [timestamp, density, speed, temperature]
    latest = data[-1]
    return {
        "timestamp" : latest[0],
        "density"   : float(latest[1]),   # prótons/cm³
        "speed"     : float(latest[2]),   # km/s
        "temp"      : float(latest[3]),   # Kelvin
    }

def get_magnetic_field():
    """Campo magnético Bz — componente sul."""
    url = "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json"
    resp = requests.get(url, timeout=10)
    data = resp.json()
    latest = data[-1]
    return {
        "timestamp": latest[0],
        "bx": float(latest[1]),
        "by": float(latest[2]),
        "bz": float(latest[3]),  # negativo = perigoso
        "bt": float(latest[4]),  # intensidade total
    }