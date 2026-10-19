
# 🛰️ Guia de Interpretação do Launch Window Score

Este documento complementa o [README principal](../readme.md) da **PAYNE** e explica como interpretar os resultados apresentados pela plataforma.

---

## 🎯 O que é o Launch Window Score?

O **Launch Window Score** é um indicador desenvolvido para apoiar a análise de riscos em janelas de lançamento espacial.

A metodologia do MVP considera dois componentes principais:

- **Clima espacial (50%):** informações provenientes de fontes como NASA e NOAA.
- **Clima terrestre (50%):** condições meteorológicas simuladas no MVP.

O resultado também considera a sensibilidade da missão analisada.

**Importante:** o score é uma ferramenta de apoio à decisão e não substitui avaliações técnicas ou autorizações operacionais.

---

## 🚦 Como interpretar as recomendações?

A PAYNE classifica os resultados em três categorias:

| Recomendação | Pontuação | Interpretação |
|---|---|---|
| 🟢 **GO** | 65 ou mais | Condições favoráveis segundo os critérios do modelo. |
| 🟡 **REVIEW** | 40 a 64 | Condições que exigem análise adicional. |
| 🔴 **HOLD** | Abaixo de 40 | Risco elevado segundo os critérios definidos no MVP. |

Essas classificações são experimentais e não representam limites oficiais de segurança para lançamentos espaciais.

---

## 📊 Como analisar os resultados da API?

O endpoint principal da PAYNE é:

`GET /v1/launch/window-score`

Ao interpretar uma resposta, é importante observar:

1. **Global Score:** pontuação consolidada da janela de lançamento.
2. **Space Weather Score:** avaliação das condições de clima espacial.
3. **Terrestrial Weather Score:** avaliação das condições meteorológicas terrestres.
4. **Mission Sensitivity:** influência da sensibilidade da missão no resultado.
5. **Main Reasons:** justificativas apresentadas para a recomendação.

A análise deve considerar o conjunto dos indicadores, e não apenas a pontuação final.

---

## 🌍 Fontes de dados e transparência

A PAYNE integra diferentes informações para construir sua análise.

| Fonte | Aplicação |
|---|---|
| **NOAA SWPC** | Indicadores e alertas de clima espacial. |
| **NASA DSCOVR / ACE** | Monitoramento do vento solar e campo magnético. |
| **GOES-R** | Monitoramento do fluxo de raios-X solares. |
| **Clima terrestre** | Simulação de condições meteorológicas no MVP. |

Integrações com METAR/TAF, NASA DONKI e Kuafu-1 fazem parte do roadmap do projeto.

---

## ⚖️ Limitações e responsabilidade

A PAYNE foi desenvolvida como uma plataforma experimental de apoio à decisão.

Por isso:

- Um resultado **GO** não garante segurança para lançamento.
- As condições climáticas podem mudar rapidamente.
- Parte dos dados utilizados no MVP é simulada.
- A decisão operacional deve permanecer sob responsabilidade de profissionais e autoridades competentes.

O objetivo é oferecer informações organizadas, rastreáveis e interpretáveis para apoiar análises técnicas.

---

## 📚 Documentação complementar

Para conhecer a arquitetura, os indicadores e as tecnologias utilizadas, consulte o [repositório principal da PAYNE](https://github.com/tsukishikawa/payne).

**Projeto:** PAYNE - Launch Intelligence Platform

**Instituição:** FIAP

**Contexto:** Global Solution 2026

---

*Documentação complementar desenvolvida para facilitar a compreensão dos indicadores e das recomendações do MVP.*
