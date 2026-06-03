# API FastAPI para dados de clima espacial
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nasa_dscovr import get_solar_wind, get_magnetic_field
from noaa import get_kp_index, get_kp_forecast
from noaa_goes import get_xray_flux

app = FastAPI()

# Permite o React (localhost:5173) chamar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/v1/status")
def status():
    """Dados em tempo real de todas as fontes."""
    return {
        "solar_wind"    : get_solar_wind(),
        "magnetic_field": get_magnetic_field(),
        "kp"            : get_kp_index(),
        "xray"          : get_xray_flux(),
    }

@app.get("/v1/forecast")
def forecast():
    """Previsão de Kp para 24h."""
    return get_kp_forecast()

@app.get("/v1/risk/{asset_type}")
def risk(asset_type: str):
    """Score de risco por tipo de ativo."""
    kp = get_kp_index()["kp"]
    multipliers = {
        "utility"  : 9.5,
        "satellite": 8.8,
        "aviation" : 7.5,
        "gps"      : 6.5,
        "submarine": 5.0,
    }
    mult = multipliers.get(asset_type.lower(), 7.0)
    score = min(99, int(kp * mult))
    level = (
        "NORMAL"  if score < 30 else
        "ELEVADO" if score < 55 else
        "ALERTA"  if score < 75 else "CRÍTICO"
    )
    return {
        "asset_type": asset_type,
        "kp_current": kp,
        "score"     : score,
        "level"     : level,
    }