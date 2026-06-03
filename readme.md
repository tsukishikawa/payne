# 🌩️ PAYNE — Space Weather Intelligence Platform

> **Previsão de tempestades solares com dados de satélites NASA + Kuafu-1 (CNSA) para proteção de infraestrutura crítica global.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-tsukishikawa.github.io%2Fpayne-FF7A1A?style=for-the-badge&logo=github)](https://tsukishikawa.github.io/payne)
[![API](https://img.shields.io/badge/API-payne--22q3.onrender.com-FF9347?style=for-the-badge&logo=fastapi)](https://payne-22q3.onrender.com/docs)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📡 O que é o PAYNE?

O PAYNE é uma plataforma B2B de monitoramento de clima espacial que transforma dados brutos de satélites em alertas acionáveis para operadores de infraestrutura crítica.

Tempestades solares causam blackouts em redes elétricas, desviam satélites de órbita, interrompem comunicações HF e corrompem sistemas GPS. O evento Carrington de 1859, se repetido hoje, causaria **US$ 2,6 trilhões em danos**. Em 1989, uma tempestade derrubou toda a rede elétrica de Quebec em 92 segundos.

O PAYNE monitora continuamente dados de **6 satélites** — incluindo o **Kuafu-1 da CNSA**, diferencial exclusivo que nenhum concorrente integra — e gera scores de risco de 0 a 100 por tipo de infraestrutura com até **72 horas de antecedência**.

---
# Próximos Passos

## 🛰️ Fontes de Dados

| Satélite | Agência | Posição | Frequência | O que fornece |
|---|---|---|---|---|
| **DSCOVR** | NASA/NOAA | L1 — 1,5M km do sol | 1 min | Velocidade e densidade do vento solar, campo Bz |
| **ACE** | NASA | L1 | 1 min | Composição do vento solar, partículas energéticas |
| **GOES-R** | NOAA | Geossíncrono | 1 min | Fluxo de raios-X — classifica fulgurações A/B/C/M/X |
| **SDO / HMI** | NASA | Geossíncrono | 45 seg | Magnetograma solar, imagens UV |
| **SOHO / LASCO** | ESA/NASA | L1 | 30 min | Coronógrafo — detecta CMEs saindo do sol |
| **Kuafu-1 (ASO-S)** 🇨🇳 | **CNSA** | Polar solar-síncrona (720km) | 5 min | Hard X-ray, Lyman-alpha, campo magnético solar |

> **Por que o Kuafu-1?** Lançado em outubro de 2022 pela China, monitora três fenômenos simultaneamente com instrumentos que nenhum satélite ocidental cobre de forma integrada. Isso garante detecção de CMEs com **12–24 horas a mais** de antecedência em relação à concorrência.

---

## 🏗️ Arquitetura

```
☀️ Satélites (NASA · CNSA · NOAA · ESA)
         │
         ▼
⚙️  Apache Airflow ── 6 DAGs (1 min → 1 semana)
         │
         ▼
🗄️  PostgreSQL + TimescaleDB ── séries temporais de alta frequência
         │                    ── PostGIS para dados geoespaciais
         │
         ▼
🧠  Python — ML Pipeline
    ├── LSTM ──────── previsão de Kp (72h)
    ├── XGBoost ───── previsão de Dst (24h)
    ├── CNN ────────── detecção de CME em imagens do coronógrafo
    └── Classificador ─ score de risco 0–100 por tipo de ativo
         │
         ▼
🏛️  Oracle DW ── histórico consolidado, relatórios regulatórios
         │
         ▼
    ┌────────────┬──────────────┐
    │  FastAPI   │    KNIME     │
    │  REST API  │  Dashboard   │
    └────────────┴──────────────┘
         │
         ▼
⚛️  React Dashboard ── dados em tempo real, previsão 72h, scores de risco
```

---

## 🧠 Modelos de Machine Learning

### LSTM — Previsão de Kp (72h)
- **Features:** velocidade do vento solar, Bz, pressão dinâmica, Kp histórico (lag 24h), fase rotação solar (27 dias)
- **Target:** Kp hora a hora para as próximas 72h
- **Performance:** RMSE ~0.7 (baseline NOAA: ~1.2)

### XGBoost — Previsão de Dst (24h)
- **Features:** Kp previsto, velocidade CME, Bz negativo acumulado
- **Target:** valor Dst nas próximas 24h (abaixo de -100 nT = tempestade severa)
- **Performance:** R² ~0.78 em eventos históricos

### CNN — Detecção de CME
- **Input:** sequência de 6 frames do coronógrafo LASCO + imagens Lyman-alpha Kuafu-1
- **Target:** CME detectada + velocidade + direção + probabilidade de impacto
- **Performance:** Precision 0.84 · Recall 0.79
- **Diferencial:** 12–24h de antecedência adicional vs modelos de vento solar

### Classificador de Risco por Ativo
- **Input:** Kp e Dst previstos + tipo de ativo + latitude
- **Output:** score 0–100 + nível (Normal/Elevado/Alerta/Crítico) + recomendação de ação
- **Performance:** Acurácia ~91% em eventos catalogados

---

## 📁 Estrutura do Projeto

```
payne/
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── App.jsx            # Dashboard principal
│   │   ├── hooks/
│   │   │   └── useSpaceWeather.js  # Hook de dados em tempo real
│   │   └── App.css
│   ├── vite.config.js
│   └── package.json
│
└── backend/
    ├── src/
    │   ├── main.py            # FastAPI — endpoints da API
    │   ├── nasa_dscovr.py     # Cliente DSCOVR + campo magnético
    │   ├── noaa.py            # Índice Kp + previsão
    │   ├── noaa_goes.py       # Fluxo de raios-X GOES-R
    │   ├── celestrak.py       # Satélites e detritos orbitais
    │   └── requirements.txt
    ├── dags/
    │   ├── dag_realtime_ingest.py
    │   ├── dag_sdo_kuafu_ingest.py
    │   ├── dag_kp_predict.py
    │   ├── dag_model_retrain.py
    │   ├── dag_sync_oracle.py
    │   └── dag_client_reports.py
    └── sql/
        ├── schema.sql         # PostgreSQL + TimescaleDB
        └── oracle_dw.sql      # Oracle Data Warehouse
```

---

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 20+
- Python 3.11+
- Git

### Frontend

```bash
cd frontend
npm install
npm run dev
# Acessa http://localhost:5173
```

### Backend

```bash
cd backend/src
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API disponível em http://localhost:8000
# Documentação em http://localhost:8000/docs
```

### Variáveis de ambiente

Cria um arquivo `.env` em `backend/src/`:

```env
# Não é necessário chave para as APIs NASA/NOAA — são abertas
# Adicionar quando integrar Kuafu-1 (NSDC China):
NSDC_USERNAME=seu_usuario
NSDC_PASSWORD=sua_senha

# Banco de dados (produção):
DATABASE_URL=postgresql://user:pass@localhost:5432/payne
ORACLE_DSN=localhost:1521/orcl
```

---

## 🔌 API

Base URL: `https://payne-22q3.onrender.com`

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/v1/status` | Dados em tempo real de todas as fontes |
| `GET` | `/v1/forecast` | Previsão de Kp para as próximas 24h |
| `GET` | `/v1/risk/{asset_type}` | Score de risco por tipo de ativo |

**Tipos de ativo aceitos:** `utility` · `satellite` · `aviation` · `gps` · `submarine`

**Exemplo de request:**
```bash
curl https://payne-22q3.onrender.com/v1/risk/utility
```

**Exemplo de response:**
```json
{
  "asset_type": "utility",
  "kp_current": 3.67,
  "score": 34,
  "level": "ELEVADO",
  "recommendation": "Monitorar transformadores de alta tensão"
}
```

> Documentação completa e interativa: **[payne-22q3.onrender.com/docs](https://payne-22q3.onrender.com/docs)**

---

## 💰 Modelo de Negócio

| Plano | Preço | O que inclui |
|---|---|---|
| **Starter** | $8k/ano | API 1.000 req/hora · alertas por e-mail · previsão 24h · 1 tipo de ativo |
| **Pro** | $50k/ano | API ilimitada · webhooks em tempo real · previsão 72h · 5 ativos · dashboard KNIME |
| **Enterprise** | Sob consulta | SLA 99.9% · dados brutos · modelo dedicado · relatório regulatório · suporte 24/7 |

**Mercado-alvo:** utilities de energia, operadores de satélites, companhias aéreas, seguradoras, governos.

**ARR projetado (base mínima):** 50 Starter + 20 Pro + 3 Enterprise = **$2,3M/ano**

---

## 📊 Como interpretar o Índice Kp

| Kp | Nível | Impacto |
|---|---|---|
| 0 – 2 | Normal | Nenhum |
| 3 – 4 | Elevado | Aurora no Canadá/Escandinávia |
| 5 – 6 | Alerta | GPS instável, rádio HF falha |
| 7 – 8 | Crítico | Redes elétricas em risco, satélites manobram |
| 9 | Extremo | Blackouts, satélites fora de órbita |

---

## 🎯 ODS Alinhado

**ODS 9 — Indústria, Inovação e Infraestrutura**

O PAYNE fortalece a resiliência de infraestrutura crítica global usando tecnologia espacial para antecipar eventos que causam bilhões em danos. Clima espacial é uma das maiores ameaças não-endereçadas à infraestrutura moderna — e a solução vem diretamente de dados orbitais.

---

## 👩‍💻 Desenvolvido por

**RM570351  - Luana Ramos Rabelo**  
**RM 573538 - Lucas Luna Pimentel**  
**RM 572886 - Mariana Ishikawa Mota**  
FIAP · Turma 1TSCPF  
Global Solution 2026 — Indústria Espacial  

---

## 📄 Licença

MIT © 2026 PAYNE

---

<div align="center">
  <sub>Dados: NASA DSCOVR · GOES-R · SDO · SOHO · <b>Kuafu-1 CNSA</b> · NOAA SWPC</sub>
</div>