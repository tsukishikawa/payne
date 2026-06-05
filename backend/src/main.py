# PAYNE Launch Intelligence — Backend FastAPI
# Inteligência climática e espacial para decisões críticas de lançamento
# FIAP Global Solution 2026 | Space Connect

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import requests

# Importa clientes existentes
from nasa_dscovr import get_solar_wind, get_magnetic_field
from noaa import get_kp_index, get_kp_forecast
from noaa_goes import get_xray_flux

app = FastAPI(
    title="PAYNE Launch Intelligence API",
    description="Inteligência climática e espacial para decisões críticas de lançamento.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Dados simulados de missão e clima terrestre ───────────────────────────────

MISSION_PROFILES = {
    "leo-small-sat": {
        "mission_id": "PAYNE-DEMO-001",
        "provider": "Rocket Lab",
        "launch_site": "alcantara",
        "target_orbit": "LEO 550km",
        "payload_type": "Smallsat IoT",
        "payload_sensitivity": "MEDIUM",
        "planned_window_start": "2026-06-09T02:00:00Z",
        "planned_window_end":   "2026-06-09T04:00:00Z",
    },
    "starlink-batch": {
        "mission_id": "PAYNE-DEMO-002",
        "provider": "SpaceX",
        "launch_site": "canaveral",
        "target_orbit": "LEO 340km",
        "payload_type": "Starlink Batch",
        "payload_sensitivity": "HIGH",
        "planned_window_start": "2026-06-10T14:30:00Z",
        "planned_window_end":   "2026-06-10T16:30:00Z",
    },
    "geo-telecom": {
        "mission_id": "PAYNE-DEMO-003",
        "provider": "ArianeGroup",
        "launch_site": "kourou",
        "target_orbit": "GEO",
        "payload_type": "Telecom Sat",
        "payload_sensitivity": "CRITICAL",
        "planned_window_start": "2026-06-11T22:00:00Z",
        "planned_window_end":   "2026-06-12T00:00:00Z",
    },
}

TERRESTRIAL_WEATHER_SIM = {
    "alcantara": {
        "site": "Alcântara — MA, Brasil",
        "wind_surface_kt": 12,
        "wind_upper_kt":   35,
        "lightning_risk":  "LOW",
        "precipitation_mm": 0.2,
        "cloud_rule_risk": "FEW",
        "visibility_km":    10,
        "score": 78,
        "source": "Simulado (MVP) — fonte real: METAR/TAF",
        "is_simulated": True,
    },
    "canaveral": {
        "site": "Cabo Canaveral — FL, EUA",
        "wind_surface_kt": 18,
        "wind_upper_kt":   42,
        "lightning_risk":  "MODERATE",
        "precipitation_mm": 1.5,
        "cloud_rule_risk": "SCT",
        "visibility_km":    8,
        "score": 58,
        "source": "Simulado (MVP) — fonte real: 45th Weather Squadron",
        "is_simulated": True,
    },
    "kourou": {
        "site": "Kourou — Guiana Francesa",
        "wind_surface_kt": 8,
        "wind_upper_kt":   22,
        "lightning_risk":  "LOW",
        "precipitation_mm": 0.0,
        "cloud_rule_risk": "FEW",
        "visibility_km":    10,
        "score": 82,
        "source": "Simulado (MVP) — fonte real: Météo-France",
        "is_simulated": True,
    },
}

# ── Motor de score ────────────────────────────────────────────────────────────

SENSITIVITY_MULT = {
    "LOW":      0.80,
    "MEDIUM":   1.00,
    "HIGH":     1.30,
    "CRITICAL": 1.60,
}

def calculate_launch_window_score(
    kp: float,
    bz: float,
    bt: float,
    xray_class: str,
    solar_wind_speed: float,
    terrestrial_score: int,
    payload_sensitivity: str = "MEDIUM",
) -> dict:
    """
    Calcula o Launch Window Score a partir de clima espacial + terrestre.

    Score space weather (0–100): quanto maior, mais seguro.
    Penalidades aplicadas por Kp, Bz negativo, fulgurações e vento.

    Princípio: regra explicável com pesos simples.
    Roadmap: ML para previsão calibrada com histórico de lançamentos.
    """
    sw_score = 100

    # Penalidade por Kp
    sw_score -= kp * 5.5
    if kp >= 7:
        sw_score -= 20  # tempestade severa

    # Penalidade por Bz (componente sul — gatilho de tempestade)
    if bz < -5:
        sw_score -= 15
    if bz < -10:
        sw_score -= 20

    # Penalidade por fulgurações
    flare_penalties = {"A": 0, "B": 0, "C": 5, "M": 20, "X": 40}
    sw_score -= flare_penalties.get(xray_class, 0)

    # Penalidade por vento solar elevado
    if solar_wind_speed > 600:
        sw_score -= 10
    if solar_wind_speed > 800:
        sw_score -= 15

    sw_score = max(0, min(100, round(sw_score)))

    # Score global ponderado
    raw_global = (sw_score * 0.50) + (terrestrial_score * 0.50)
    mult = SENSITIVITY_MULT.get(payload_sensitivity, 1.0)
    global_score = max(0, min(100, round(raw_global / mult)))

    # Recomendação
    if global_score >= 65:
        recommendation = "GO"
        action = "Prosseguir com countdown — monitoramento contínuo ativo."
    elif global_score >= 40:
        recommendation = "HOLD"
        action = "Aguardar melhora nas condições. Revisar em 30 minutos e manter equipe em posição."
    else:
        recommendation = "REVIEW"
        action = "Revisar janela de lançamento. Consultar sala de controle e avaliar próxima janela disponível."

    # Motivos principais
    reasons = []
    if kp >= 5:
        reasons.append(f"Kp={kp:.1f} — atividade geomagnética elevada ({_kp_label(kp)})")
    if bz < -5:
        reasons.append(f"Bz={bz:.1f} nT — componente sul desfavorável para magnetosfera")
    if xray_class in ("M", "X"):
        reasons.append(f"Fulguração solar classe {xray_class} detectada pelo GOES-R")
    if solar_wind_speed > 600:
        reasons.append(f"Vento solar elevado: {solar_wind_speed:.0f} km/s")
    if terrestrial_score < 60:
        reasons.append("Condições meteorológicas no local abaixo do limiar de lançamento")
    if not reasons:
        reasons.append("Condições nominais — todos os parâmetros dentro dos limites operacionais")

    return {
        "global_score":         global_score,
        "space_weather_score":  sw_score,
        "terrestrial_score":    terrestrial_score,
        "recommendation":       recommendation,
        "action":               action,
        "main_reasons":         reasons,
    }


def _kp_label(kp: float) -> str:
    if kp < 3: return "Normal"
    if kp < 5: return "Elevado"
    if kp < 7: return "Alerta"
    return "Crítico"

# ── Endpoints existentes (mantidos) ──────────────────────────────────────────

@app.get("/v1/status", summary="Dados de clima espacial em tempo real")
def status():
    """Retorna dados em tempo real de NOAA SWPC, DSCOVR e GOES-R."""
    return {
        "solar_wind":     get_solar_wind(),
        "magnetic_field": get_magnetic_field(),
        "kp":             get_kp_index(),
        "xray":           get_xray_flux(),
        "generated_at":   datetime.now(timezone.utc).isoformat(),
        "sources":        ["NOAA SWPC", "DSCOVR/ACE", "GOES-R"],
    }


@app.get("/v1/forecast", summary="Previsão de Kp para 24h")
def forecast():
    """Previsão de Kp para as próximas 24 horas (NOAA SWPC)."""
    return {
        "forecast":     get_kp_forecast(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source":       "NOAA SWPC",
        "is_simulated": False,
    }


@app.get("/v1/risk/{asset_type}", summary="Score de risco por tipo de ativo (legado)")
def risk_legacy(asset_type: str):
    """
    Endpoint legado — mantido para compatibilidade.
    Preferir /v1/launch/window-score para o novo escopo de Launch Intelligence.
    """
    kp_data = get_kp_index()
    kp = float(kp_data.get("kp", 4.0))
    multipliers = {
        "utility":   9.5, "satellite": 8.8,
        "aviation":  7.5, "gps":       6.5, "submarine": 5.0,
    }
    mult  = multipliers.get(asset_type.lower(), 7.0)
    score = min(99, int(kp * mult))
    level = "NORMAL" if score < 30 else "ELEVADO" if score < 55 else "ALERTA" if score < 75 else "CRÍTICO"
    return {
        "asset_type":   asset_type,
        "kp_current":   kp,
        "score":        score,
        "level":        level,
        "note":         "Endpoint legado. Use /v1/launch/window-score para Launch Intelligence.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

# ── Novos endpoints — Launch Intelligence ─────────────────────────────────────

@app.get("/v1/launch/window-score", summary="Launch Window Score — GO / HOLD / REVIEW")
def launch_window_score(
    site:    str = Query("alcantara", description="ID do local de lançamento: alcantara | canaveral | kourou"),
    mission: str = Query("leo-small-sat", description="ID da missão: leo-small-sat | starlink-batch | geo-telecom"),
):
    """
    Endpoint principal da Payne Launch Intelligence.

    Integra dados reais de clima espacial (NOAA/NASA) com perfil de missão
    e clima terrestre simulado para gerar uma recomendação explicável:
    GO, HOLD ou REVIEW.

    Princípio: apoio à decisão — a decisão final é operacional e humana.
    """
    # Dados reais de clima espacial
    kp_data   = get_kp_index()
    mag_data  = get_magnetic_field()
    wind_data = get_solar_wind()
    xray_data = get_xray_flux()

    kp    = float(kp_data.get("kp", 4.0))
    bz    = float(mag_data.get("bz", -2.0))
    bt    = float(mag_data.get("bt", 5.0))
    speed = float(wind_data.get("speed", 400.0))
    xray_class = str(xray_data.get("classe", "B"))

    # Perfil da missão
    mission_data = MISSION_PROFILES.get(mission, MISSION_PROFILES["leo-small-sat"])
    site_key     = mission_data.get("launch_site", site)
    sensitivity  = mission_data.get("payload_sensitivity", "MEDIUM")

    # Clima terrestre
    terrestrial = TERRESTRIAL_WEATHER_SIM.get(site_key, TERRESTRIAL_WEATHER_SIM["alcantara"])

    # Calcular score
    score_result = calculate_launch_window_score(
        kp=kp, bz=bz, bt=bt,
        xray_class=xray_class,
        solar_wind_speed=speed,
        terrestrial_score=terrestrial["score"],
        payload_sensitivity=sensitivity,
    )

    return {
        "mission_id":                mission_data["mission_id"],
        "provider":                  mission_data["provider"],
        "launch_site":               terrestrial["site"],
        "target_orbit":              mission_data["target_orbit"],
        "payload_sensitivity":       sensitivity,
        "planned_window":            mission_data["planned_window_start"],

        "recommendation":            score_result["recommendation"],
        "global_score":              score_result["global_score"],
        "space_weather_score":       score_result["space_weather_score"],
        "terrestrial_weather_score": score_result["terrestrial_score"],
        "main_reasons":              score_result["main_reasons"],
        "action":                    score_result["action"],

        "space_weather_inputs": {
            "kp":              kp,
            "bz_nt":           bz,
            "bt_nt":           bt,
            "solar_wind_km_s": speed,
            "xray_class":      xray_class,
            "source":          "NOAA SWPC + DSCOVR/ACE + GOES-R",
            "is_simulated":    False,
        },

        "terrestrial_weather": {
            "wind_surface_kt":  terrestrial["wind_surface_kt"],
            "lightning_risk":   terrestrial["lightning_risk"],
            "cloud_rule_risk":  terrestrial["cloud_rule_risk"],
            "visibility_km":    terrestrial["visibility_km"],
            "source":           terrestrial["source"],
            "is_simulated":     terrestrial["is_simulated"],
        },

        "methodology": {
            "score_weights":       "space_weather=50% + terrestrial=50%",
            "sensitivity_mult":    SENSITIVITY_MULT.get(sensitivity, 1.0),
            "go_threshold":        65,
            "hold_threshold":      40,
            "human_in_the_loop":   True,
            "version":             "1.1.0-mvp",
        },

        "governance": {
            "disclaimer":   "Score de apoio à decisão. Não substitui autoridade operacional de lançamento.",
            "not_replaces": ["NOAA SWPC", "NASA", "U.S. Space Force", "FAA", "45th Weather Squadron"],
        },

        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources":      ["NOAA SWPC", "DSCOVR/ACE (NASA)", "GOES-R", terrestrial["source"]],
    }


@app.get("/v1/mission/profile", summary="Perfis de missão disponíveis")
def mission_profiles():
    """Lista perfis de missão disponíveis para simulação no MVP."""
    return {
        "missions":     list(MISSION_PROFILES.values()),
        "note":         "MVP com missões simuladas. Roadmap: integração com calendários de lançamento reais.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/v1/launch/sites", summary="Locais de lançamento disponíveis")
def launch_sites():
    """Lista locais de lançamento com dados de clima terrestre simulados."""
    return {
        "sites":        list(TERRESTRIAL_WEATHER_SIM.values()),
        "note":         "Clima terrestre simulado no MVP. Roadmap: METAR/TAF via API meteorológica real.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", summary="Informações da API")
def root():
    return {
        "product":     "PAYNE Launch Intelligence",
        "description": "Inteligência climática e espacial para decisões críticas de lançamento.",
        "version":     "1.1.0",
        "ods":         "ODS 9 — Indústria, Inovação e Infraestrutura",
        "brand_story": "Homenagem a Cecilia Payne-Gaposchkin (1900–1979). Ela leu a luz das estrelas para revelar do que o Sol é feito. A Payne lê os sinais do Sol para revelar quando ele pode colocar uma missão em risco.",
        "endpoints": {
            "launch_intelligence": [
                "GET /v1/launch/window-score?site=alcantara&mission=leo-small-sat",
                "GET /v1/mission/profile",
                "GET /v1/launch/sites",
            ],
            "space_weather": [
                "GET /v1/status",
                "GET /v1/forecast",
            ],
            "docs": "/docs",
        },
        "data_sources": {
            "real":      ["NOAA SWPC", "DSCOVR/ACE (NASA)", "GOES-R"],
            "simulated": ["Clima terrestre (MVP)", "Perfis de missão (MVP)"],
            "roadmap":   ["Kuafu-1 (CNSA)", "NASA DONKI", "METAR/TAF", "45th Weather Squadron"],
        },
        "governance": {
            "human_in_the_loop": True,
            "disclaimer":        "Apoio à decisão. Não substitui NOAA, NASA, Space Force ou FAA.",
        },
    }