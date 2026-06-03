#Celestrak — satélites e detritos orbitais
import requests 

def get_active_satellites():
    """Lista de satélites ativos em órbita."""
    url = "https://celestrak.org/SOCRATES/query.php?catalog=active&format=json"
    resp = requests.get(url, timeout=15)
    return resp.json()