#NOAA GOES-R — raios-X solares
import requests 

def get_xray_flux():
    """Fluxo de raios-X — detecta fulgurações A/B/C/M/X."""
    url = "https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json"
    resp = requests.get(url, timeout=10)
    data = resp.json()
    latest = data[-1]
    flux = float(latest["flux"])
    # Classificação da fulguração
    if   flux < 1e-7: classe = "A"
    elif flux < 1e-6: classe = "B"
    elif flux < 1e-5: classe = "C"
    elif flux < 1e-4: classe = "M"
    else:             classe = "X"
    return {"timestamp": latest["time_tag"], "flux": flux, "classe": classe}