# 🚀 PAYNE — Launch Intelligence Platform

> **Inteligência climática e espacial para decisões críticas de lançamento.**
> *O lançamento começa antes da ignição. Começa na leitura correta do risco.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-tsukishikawa.github.io%2Fpayne-FF7A1A?style=for-the-badge&logo=github)](https://tsukishikawa.github.io/payne)
[![API](https://img.shields.io/badge/API-payne--22q3.onrender.com-FF9347?style=for-the-badge&logo=fastapi)](https://payne-22q3.onrender.com/docs)
[![ODS 9](https://img.shields.io/badge/ODS%209-Infraestrutura%20Resiliente-orange?style=for-the-badge)](https://sdgs.un.org/goals/goal9)
[![FIAP GS 2026](https://img.shields.io/badge/FIAP-Global%20Solution%202026-blue?style=for-the-badge)](https://fiap.com.br)

---

## 🌟 Por que PAYNE?

A empresa se chama **Payne** em homenagem a **Cecilia Payne-Gaposchkin** (1900–1979). Em 1925, ela demonstrou que o Sol é composto principalmente por hidrogênio e hélio — contrariando a visão dominante da época. Sua história carrega ciência, coragem e evidência: uma jovem pesquisadora interpretou sinais invisíveis quando ninguém mais acreditava.

> *Cecilia Payne leu a luz das estrelas para revelar do que o Sol é feito.*
> *A Payne lê os sinais do Sol para revelar quando ele pode colocar uma missão em risco.*

---

## 🎯 O que é o PAYNE Launch Intelligence?

Uma plataforma de apoio à decisão para operações espaciais críticas. Integra dados reais de **clima espacial** (NASA/NOAA), dados de **clima terrestre** e **perfil de missão** para gerar um único score:

```
LAUNCH WINDOW SCORE → GO | HOLD | REVIEW
```

A pergunta que o PAYNE responde é clara e operacional:

> *Esta janela de lançamento é segura, eficiente e justificável do ponto de vista técnico e financeiro?*

---

## 🛰️ Fontes de Dados

| Fonte | O que fornece | Status |
|---|---|---|
| **NOAA SWPC** | Kp, alertas, escalas de clima espacial | ✅ Real (conectado) |
| **DSCOVR / ACE (NASA)** | Vento solar, campo Bz, Bt em tempo real | ✅ Real (conectado) |
| **GOES-R** | Fluxo de raios-X — classifica fulgurações A/B/C/M/X | ✅ Real (conectado) |
| **Clima terrestre** | Vento, raios, nuvens, visibilidade no launch site | ⚠️ Simulado no MVP |
| **Kuafu-1 (CNSA)** | Hard X-ray, Lyman-alpha — +12–24h de antecedência | 🗺️ Roadmap |
| **NASA DONKI** | Histórico de CMEs e eventos solares | 🗺️ Roadmap |
| **METAR / TAF** | Meteorologia real no local de lançamento | 🗺️ Roadmap |

---

## 🏗️ Arquitetura

```
☀️  Satélites (DSCOVR · GOES-R · ACE · SDO · Kuafu-1)
            │
            ▼
⚙️   Python — ingestão e padronização (requests / pandas)
            │
            ▼
📋   Modelo canônico
     ├── mission_profile        (provider, site, orbit, sensitivity)
     ├── launch_site_weather    (vento, raios, visibilidade — simulado MVP)
     ├── space_weather_status   (Kp, Bz, X-Ray — dados reais)
     ├── launch_window_score    (score, recommendation, reasons)
     └── recommendation_log    (timestamp, level, reason, is_simulated)
            │
            ▼
🔌   FastAPI — API REST com documentação automática (/docs)
     ├── GET /v1/launch/window-score   ← endpoint principal
     ├── GET /v1/mission/profile
     ├── GET /v1/launch/sites
     ├── GET /v1/status                ← clima espacial em tempo real
     └── GET /v1/forecast
            │
            ▼
    ┌───────────────┬─────────────────┐
    │  React + Vite │  KNIME (roadmap) │
    │  Dashboard    │  Relatórios PDF  │
    └───────────────┴─────────────────┘
```

---

## 🧮 Como funciona o Launch Window Score

O score combina dois componentes com pesos iguais:

```
Score Global = (Clima Espacial × 50%) + (Clima Terrestre × 50%)
               ajustado pela Sensibilidade da Missão (0.8x – 1.6x)
```

**Componente de Clima Espacial** (dados reais):
- Base 100 pontos, com penalidades por Kp elevado, Bz negativo, fulgurações M/X e vento solar alto

**Componente de Clima Terrestre** (simulado no MVP):
- Score por site baseado em critérios de launch commit criteria reais (45th Weather Squadron)

**Sensibilidade da missão:**
| Nível | Multiplicador | Exemplo |
|---|---|---|
| LOW | 0.8× | Cargo não-crítico |
| MEDIUM | 1.0× | Smallsat padrão |
| HIGH | 1.3× | Starlink / LEO denso |
| CRITICAL | 1.6× | GEO / carga humana |

**Recomendação:**
GO → Score ≥ 65
REVIEW → Score 40–64
HOLD → Score < 40

---

## 📡 API — Endpoint principal

```bash
GET /v1/launch/window-score?site=alcantara&mission=leo-small-sat
```

**Exemplo de resposta:**

```json
{
  "mission_id": "PAYNE-DEMO-001",
  "recommendation": "GO",
  "global_score": 74,
  "space_weather_score": 68,
  "terrestrial_weather_score": 78,
  "main_reasons": ["Condições nominais — todos os parâmetros dentro dos limites"],
  "action": "Prosseguir com countdown — monitoramento contínuo ativo.",
  "methodology": {
    "score_weights": "space_weather=50% + terrestrial=50%",
    "human_in_the_loop": true,
    "version": "1.1.0-mvp"
  },
  "governance": {
    "disclaimer": "Score de apoio à decisão. Não substitui autoridade operacional de lançamento."
  }
}
```

**Locais disponíveis:** `alcantara` · `canaveral` · `kourou`

**Missões disponíveis:** `leo-small-sat` · `starlink-batch` · `geo-telecom`

---

## 🖥️ Dashboard — 5 abas

| Aba | O que mostra |
|---|---|
| **Launch Window** | Score GO/HOLD/REVIEW ao vivo, breakdown de componentes, clima terrestre, feed de eventos |
| **Mission Risk** | Risco por fase da missão (pré-lançamento → recuperação), custo de adiamento |
| **Space Weather** | Gauge Kp, Bz, vento solar, escala de impacto por faixa de Kp, histórico de falhas |
| **API Demo** | Chamada interativa ao endpoint `/v1/launch/window-score` com resposta JSON real |
| **Methodology** | Origem da marca (Cecilia Payne), metodologia do score, governança e limitações |

---

## 👥 Público-Alvo

| Segmento | Exemplos | Dor principal |
|---|---|---|
| **Launch providers** | SpaceX, Rocket Lab, ULA, Firefly | Janela de lançamento com menor risco e menor custo de adiamento |
| **Operadores de satélite** | Starlink, OneWeb, Planet, Iridium | Proteger carga útil na órbita inicial |
| **Spaceports / Ranges** | Alcântara, Canaveral, Kourou | Segurança, critérios e comunicação com operadores |
| **Seguradoras espaciais** | Lloyd's, Munich Re, Swiss Re | Precificar risco de missão e lançamento |
| **Governo / Defesa** | Agências espaciais, FAB, ESA | Governança de risco e resiliência |

---

## ⚡ Casos históricos documentados

| Evento | O que aconteceu |
|---|---|
| **Apollo 12 (1969)** | Missão atingida por raios após decolagem. Sobreviveu. Gerou os launch commit criteria para raios. |
| **Atlas-Centaur AC-67 (1987)** | Descarga elétrica em condição adversa. Missão perdida. Reforçou critérios meteorológicos. |
| **Starlink Batch (2022)** | Tempestade geomagnética G1 elevou arrasto atmosférico. 40 satélites perdidos em órbita inicial. |

---

## 📁 Estrutura do repositório

```
payne/
├── frontend/
│   └── src/
│       ├── App.jsx                    ← Dashboard Launch Intelligence
│       └── hooks/
│           └── useSpaceWeather.js     ← Hook de dados em tempo real
└── backend/
    └── src/
        ├── main.py                    ← FastAPI com endpoints de Launch Intelligence
        ├── nasa_dscovr.py             ← DSCOVR + campo magnético (real)
        ├── noaa.py                    ← Kp + previsão (real)
        ├── noaa_goes.py               ← Raios-X GOES-R (real)
        └── requirements.txt
```

---

## 🚀 Como rodar localmente

```bash
# Backend
cd backend/src
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## ⚖️ Governança

| Princípio | Aplicação |
|---|---|
| **Fonte oficial** | NOAA/NASA para clima espacial — sempre referenciadas |
| **Rastreabilidade** | Todo score exibe fonte, timestamp e versão da regra |
| **Explicabilidade** | O sistema mostra por que recomendou GO, HOLD ou REVIEW |
| **Human-in-the-loop** | A decisão de lançamento é operacional e humana |
| **Dados simulados** | Identificados claramente na API e no dashboard |
| **Limitação clara** | Não substitui NOAA, NASA, Space Force, FAA ou reguladores |

---

## 🗺️ Roadmap

- [x] Dashboard com Launch Window Score (GO/HOLD/REVIEW)
- [x] Dados reais NOAA/NASA conectados (Kp, Bz, X-Ray)
- [x] API FastAPI com endpoint `/v1/launch/window-score`
- [x] Aba Methodology com governança e limitações
- [x] Deploy GitHub Pages + Render
- [ ] Clima terrestre real via METAR/TAF
- [ ] Integração Kuafu-1 (CNSA) — +12–24h de antecedência
- [ ] NASA DONKI — histórico de CMEs
- [ ] PostgreSQL + TimescaleDB em produção
- [ ] Modelo ML para previsão calibrada com histórico

---

## 🎯 ODS 9 — Indústria, Inovação e Infraestrutura

O PAYNE fortalece a resiliência de infraestrutura espacial crítica usando dados orbitais para antecipar riscos que causam perdas de missão, blackouts e danos financeiros significativos. Cada lançamento mais seguro é infraestrutura mais confiável para o planeta.

---

## 👩‍💻 Desenvolvido por

RM570351 - Luana Ramos Rabelo  
RM 573538 - Lucas Luna Pimentel  
RM 572886 - Mariana Ishikawa Mota  
FIAP · Turma 1TSCPF
Global Solution 2026 — Indústria Espacial · Parceiro: Pacto Global da ONU

---

<div align="center">
  <sub>Dados: NASA DSCOVR · GOES-R · NOAA SWPC · <b>Kuafu-1 CNSA (roadmap)</b></sub><br/>
  <sub>Homenagem a Cecilia Payne-Gaposchkin (1900–1979)</sub>
</div>
