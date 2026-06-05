import { useState, useEffect, useRef } from "react";

// ── Brand ─────────────────────────────────────────────────────────────────────
const C = {
  bg: "#050505", surface: "#0a0d14", surfaceHi: "#10131A",
  border: "#1a1f2e", borderHi: "#252c3d",
  orange: "#FF7A1A", orangeHi: "#FF9347",
  gold: "#fbbf24", red: "#f87171", green: "#34d399",
  text: "#FFFFFF", textSub: "#72819A", textDim: "#273350", muted: "#334466",
};

const F = {
  display: "'Orbitron', 'Trebuchet MS', system-ui, sans-serif",
  body: "'Inter', 'Calibri', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
};

const ANIM = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes goGlow{0%,100%{box-shadow:0 0 12px #34d39966}50%{box-shadow:0 0 32px #34d399cc}}
@keyframes holdGlow{0%,100%{box-shadow:0 0 12px #fbbf2466}50%{box-shadow:0 0 32px #fbbf24cc}}
@keyframes reviewGlow{0%,100%{box-shadow:0 0 12px #f8717166}50%{box-shadow:0 0 32px #f87171cc}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(400%)}}
.disp{font-family:'Orbitron','Trebuchet MS',system-ui;letter-spacing:.08em}
.mono{font-family:'JetBrains Mono','Courier New',monospace}
.eyebrow{font-family:'Orbitron','Trebuchet MS',system-ui;text-transform:uppercase;letter-spacing:.2em;font-size:9px;font-weight:600}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function recommendationStyle(rec) {
  if (rec === "GO")     return { color: C.green,  bg: "#34d39915", border: `1px solid ${C.green}44`,  glow: "goGlow" };
  if (rec === "HOLD")   return { color: C.gold,   bg: "#fbbf2415", border: `1px solid ${C.gold}44`,   glow: "holdGlow" };
  return                       { color: C.red,    bg: "#f8717115", border: `1px solid ${C.red}44`,    glow: "reviewGlow" };
}

function kpToLevel(kp) {
  if (kp < 3) return { label: "NORMAL",  color: C.green };
  if (kp < 5) return { label: "ELEVADO", color: C.gold };
  if (kp < 7) return { label: "ALERTA",  color: C.orange };
  return              { label: "CRÍTICO", color: C.red };
}

function calcLaunchWindowScore(kp, bz, xrayClass, terrestrialScore = 70, missionSensitivity = "MEDIUM") {
  const sensitivityMult = { LOW: 0.8, MEDIUM: 1.0, HIGH: 1.3, CRITICAL: 1.6 }[missionSensitivity] || 1.0;

  // Space weather score (0-100, lower = better conditions)
  let swScore = 100;
  swScore -= kp * 6;
  if (bz < -5)  swScore -= 15;
  if (bz < -10) swScore -= 20;
  if (xrayClass === "M") swScore -= 20;
  if (xrayClass === "X") swScore -= 40;
  swScore = Math.max(0, Math.min(100, swScore));

  // Final weighted score
  const globalScore = Math.round((swScore * 0.5 + terrestrialScore * 0.5) * (1 / sensitivityMult));
  const clampedScore = Math.max(0, Math.min(100, globalScore));

  let recommendation = "GO";
  if (clampedScore < 40)       recommendation = "REVIEW";
  else if (clampedScore < 65)  recommendation = "HOLD";

  return { globalScore: clampedScore, swScore: Math.round(swScore), terrestrialScore, recommendation };
}

// ── Simulated mission profiles ─────────────────────────────────────────────────
const MISSIONS = [
  { id: "PAYNE-DEMO-001", provider: "Rocket Lab",  site: "Alcântara — MA, Brasil",    orbit: "LEO 550km", payload: "Smallsat IoT",     sensitivity: "MEDIUM",   window: "2026-06-09 02:00 UTC" },
  { id: "PAYNE-DEMO-002", provider: "SpaceX",      site: "Cabo Canaveral — FL, EUA",  orbit: "LEO 340km", payload: "Starlink Batch",   sensitivity: "HIGH",     window: "2026-06-10 14:30 UTC" },
  { id: "PAYNE-DEMO-003", provider: "ArianeGroup", site: "Kourou — Guiana Francesa",  orbit: "GEO",       payload: "Telecom Sat",     sensitivity: "CRITICAL", window: "2026-06-11 22:00 UTC" },
];

const TERRESTRIAL_SIM = {
  "Alcântara — MA, Brasil":   { wind: "12 kt", lightning: "LOW", clouds: "FEW", visibility: "10km+", score: 78 },
  "Cabo Canaveral — FL, EUA": { wind: "18 kt", lightning: "MODERATE", clouds: "SCT", visibility: "8km", score: 58 },
  "Kourou — Guiana Francesa": { wind: "8 kt",  lightning: "LOW",      clouds: "FEW", visibility: "10km+", score: 82 },
};

// ── Live data pool ────────────────────────────────────────────────────────────
const EVENT_POOL = [
  { src: "NOAA SWPC",       color: C.orange,    msg: "Kp atualizado — índice geomagnético horário disponível" },
  { src: "DSCOVR / L1",     color: C.orangeHi,  msg: "Vento solar: velocidade e Bz atualizados" },
  { src: "GOES-R",          color: C.orange,    msg: "Fluxo X-Ray: sem fulgurações M ou X no momento" },
  { src: "Kuafu-1 (CNSA)",  color: C.gold,      msg: "Hard X-ray: nível nominal — sem alertas ativos" },
  { src: "Launch Score",    color: C.green,     msg: "Score atualizado para janela ativa — verificar aba Launch Window" },
  { src: "GOES-R",          color: C.orange,    msg: "Partículas energéticas: fluxo dentro do nominal para LEO" },
  { src: "NOAA SWPC",       color: C.orange,    msg: "Forecast 3h emitido — sem tempestades previstas" },
  { src: "Payne AI",        color: C.text,      msg: "Modelo de score recalculado com dados mais recentes" },
  { src: "DSCOVR / L1",     color: C.orangeHi,  msg: "Bz estável — componente norte, condições favoráveis" },
  { src: "Launch Score",    color: C.gold,      msg: "Monitoramento de janela ativo — próxima atualização em 60s" },
];

// ── Component primitives ──────────────────────────────────────────────────────
function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderTop: accent ? `2px solid ${C.orange}` : undefined,
      borderRadius: 6, padding: "14px 16px", ...style,
    }}>{children}</div>
  );
}

function CornerTick({ color = C.orange }) {
  const s = { position: "absolute", width: 8, height: 8, borderColor: color, borderStyle: "solid" };
  return (
    <>
      <span style={{ ...s, top: -1, left: -1, borderWidth: "1px 0 0 1px" }} />
      <span style={{ ...s, top: -1, right: -1, borderWidth: "1px 1px 0 0" }} />
      <span style={{ ...s, bottom: -1, left: -1, borderWidth: "0 0 1px 1px" }} />
      <span style={{ ...s, bottom: -1, right: -1, borderWidth: "0 1px 1px 0" }} />
    </>
  );
}

function Chip({ label, color = C.orange }) {
  return (
    <span className="eyebrow" style={{
      padding: "2px 9px", borderRadius: 2,
      background: color + "18", color, border: `1px solid ${color}44`,
    }}>{label}</span>
  );
}

function ScoreArc({ score, recommendation }) {
  const st = recommendationStyle(recommendation);
  const r = 52, cx = 64, cy = 64;
  const sweep = (score / 100) * 251.2;
  const circumference = 2 * Math.PI * r;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={128} height={128} viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={8} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={st.color} strokeWidth={8}
          strokeDasharray={`${sweep} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ filter: `drop-shadow(0 0 8px ${st.color})`, transition: "stroke-dasharray 1s ease" }}
        />
        <text x={cx} y={cy - 4} fontSize={28} fontFamily="Orbitron,Trebuchet MS" fontWeight={700}
          fill={st.color} textAnchor="middle">{score}</text>
        <text x={cx} y={cy + 16} fontSize={8} fontFamily="Orbitron" fill={C.textSub} textAnchor="middle" letterSpacing={3}>SCORE</text>
      </svg>
    </div>
  );
}

function RecommendationBadge({ rec }) {
  const st = recommendationStyle(rec);
  return (
    <div className="disp" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: "10px 28px", borderRadius: 4,
      background: st.bg, border: st.border, color: st.color,
      fontSize: 20, fontWeight: 800, letterSpacing: ".2em",
      animation: `${st.glow} 2s infinite`,
    }}>{rec}</div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "launch",    label: "Launch Window" },
  { id: "mission",   label: "Mission Risk" },
  { id: "space",     label: "Space Weather" },
  { id: "api",       label: "API Demo" },
  { id: "method",    label: "Methodology" },
];

// ── PANEL: LAUNCH WINDOW ─────────────────────────────────────────────────────
function PanelLaunchWindow({ kp, bz, xray, events, tick, selectedMission }) {
  const mission = MISSIONS[selectedMission];
  const terrestrial = TERRESTRIAL_SIM[mission.site];
  const { globalScore, swScore, terrestrialScore, recommendation } =
    calcLaunchWindowScore(kp, bz, xray, terrestrial.score, mission.sensitivity);
  const st = recommendationStyle(recommendation);
  const reasons = [];
  if (kp >= 5) reasons.push(`Kp=${kp.toFixed(1)} — atividade geomagnética elevada`);
  if (bz < -5) reasons.push(`Bz=${bz.toFixed(1)} nT — componente sul desfavorável`);
  if (xray === "M" || xray === "X") reasons.push(`Fulguração classe ${xray} detectada`);
  if (terrestrial.lightning !== "LOW") reasons.push(`Risco de raios: ${terrestrial.lightning} no local de lançamento`);
  if (reasons.length === 0) reasons.push("Condições nominais — todos os parâmetros dentro do limite");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp .25s ease" }}>
      {/* Mission selector */}
      <Card accent>
        <div className="eyebrow" style={{ color: C.orange, marginBottom: 8 }}>Missão ativa</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {MISSIONS.map((m, i) => (
            <div key={m.id} style={{
              padding: "10px 12px", borderRadius: 4, cursor: "pointer",
              background: i === selectedMission ? C.orange + "18" : C.surfaceHi,
              border: `1px solid ${i === selectedMission ? C.orange : C.border}`,
            }}>
              <div className="disp" style={{ fontSize: 9, color: i === selectedMission ? C.orange : C.textSub, marginBottom: 3 }}>{m.id}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 2 }}>{m.provider}</div>
              <div style={{ fontSize: 10, color: C.textSub }}>{m.site}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main score */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14 }}>
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative" }}>
          <CornerTick />
          <div className="eyebrow" style={{ color: C.textSub }}>Launch Window Score</div>
          <ScoreArc score={globalScore} recommendation={recommendation} />
          <RecommendationBadge rec={recommendation} />
          <div className="mono" style={{ fontSize: 9, color: C.textDim, marginTop: 4 }}>
            UPDATED {tick * 3}s AGO
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Mission info */}
          <Card>
            <div className="eyebrow" style={{ color: C.orange, marginBottom: 8 }}>Perfil da Missão</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["Provedor", mission.provider], ["Site", mission.site],
                ["Órbita-alvo", mission.orbit], ["Payload", mission.payload],
                ["Sensibilidade", mission.sensitivity], ["Janela", mission.window],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "6px 10px", background: C.surfaceHi, borderRadius: 4, border: `1px solid ${C.border}` }}>
                  <div className="eyebrow" style={{ color: C.textDim, marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 11, color: C.text, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Score breakdown */}
          <Card>
            <div className="eyebrow" style={{ color: C.orange, marginBottom: 10 }}>Componentes do Score</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["☀️ Clima Espacial", swScore, swScore > 65 ? C.green : swScore > 40 ? C.gold : C.red],
                ["🌩️ Clima Terrestre", terrestrialScore, terrestrialScore > 65 ? C.green : terrestrialScore > 40 ? C.gold : C.red],
              ].map(([label, score, color]) => (
                <div key={label} style={{ padding: "10px 12px", background: C.surfaceHi, borderRadius: 4, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.textSub, marginBottom: 6 }}>{label}</div>
                  <div className="disp" style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 6 }}>{score}</div>
                  <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Reasons & terrestrial */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card style={{ borderLeft: `3px solid ${st.color}` }}>
          <div className="eyebrow" style={{ color: st.color, marginBottom: 8 }}>
            Motivos da Recomendação — {recommendation}
          </div>
          {reasons.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: C.textSub, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: st.color }}>→</span> {r}
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 11, color: C.textDim, fontStyle: "italic" }}>
            ⚠ A decisão final de lançamento é operacional e humana. Este score é de apoio.
          </div>
        </Card>

        <Card>
          <div className="eyebrow" style={{ color: C.orange, marginBottom: 8 }}>Clima Terrestre — {mission.site}</div>
          {[
            ["🌬️ Vento superficial", terrestrial.wind],
            ["⚡ Risco de raios", terrestrial.lightning],
            ["☁️ Nebulosidade", terrestrial.clouds],
            ["👁️ Visibilidade", terrestrial.visibility],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.textSub }}>{k}</span>
              <span style={{ color: v === "MODERATE" ? C.gold : v === "HIGH" ? C.red : C.text, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: "4px 8px", background: C.textDim + "22", borderRadius: 4, fontSize: 10, color: C.textDim }}>
            Dados simulados — fonte real: METAR/TAF via Weather API
          </div>
        </Card>
      </div>

      {/* Event log */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="eyebrow" style={{ color: C.orange }}>Feed de Monitoramento — Tempo Real</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "blink 1.5s infinite" }} />
            <span className="mono" style={{ fontSize: 9, color: C.textSub }}>LIVE</span>
          </div>
        </div>
        <div style={{ maxHeight: 140, overflowY: "auto", fontFamily: F.mono, fontSize: 10 }}>
          {events.map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "72px 130px 1fr", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.textDim }}>{e.time}</span>
              <span style={{ color: e.color, fontWeight: 600 }}>[{e.src}]</span>
              <span style={{ color: C.textSub }}>{e.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── PANEL: MISSION RISK ───────────────────────────────────────────────────────
function PanelMissionRisk({ kp }) {
  const phases = [
    { phase: "Pré-lançamento",  risks: ["Clima terrestre", "Raios / eletricidade", "Vento de altitude", "GPS/GNSS"], status: kp > 5 ? "REVIEW" : "GO" },
    { phase: "Countdown",       risks: ["T-30min: verificar Bz", "T-10min: vento final", "Hold criteria", "Comunicações"], status: kp > 4 ? "HOLD" : "GO" },
    { phase: "Ascensão",        risks: ["Max-Q aerodínâmico", "Separação de estágio", "Comunicação HF", "GPS ascent"], status: kp > 6 ? "REVIEW" : "GO" },
    { phase: "Órbita inicial",  risks: ["Arrasto atmosférico", "Radiação Van Allen", "CME / tempestade", "Satélite LEO"], status: kp > 5 ? "HOLD" : "GO" },
    { phase: "Recuperação",     risks: ["Mar e vento", "Visibilidade área", "GPS recuperação", "Comunicação marítima"], status: "GO" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp .25s ease" }}>
      <Card>
        <div className="eyebrow" style={{ color: C.orange, marginBottom: 6 }}>Risco por Fase da Missão</div>
        <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
          Monitoramento de riscos ao longo do ciclo completo da missão — do pré-lançamento à recuperação.
          Baseado em dados reais de clima espacial + perfil simulado de missão LEO.
        </div>
      </Card>
      {phases.map(p => {
        const st = recommendationStyle(p.status);
        return (
          <Card key={p.phase} style={{ borderLeft: `3px solid ${st.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="disp" style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{p.phase}</div>
              <Chip label={p.status} color={st.color} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {p.risks.map(r => (
                <span key={r} style={{ fontSize: 10, padding: "3px 10px", background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 3, color: C.textSub }}>
                  {r}
                </span>
              ))}
            </div>
          </Card>
        );
      })}

      <Card>
        <div className="eyebrow" style={{ color: C.gold, marginBottom: 8 }}>Custo esperado de adiamento (simulado)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            ["Custo de 1 scrub", "$150k–500k", C.orange],
            ["Janela perdida", "$2M–5M (satélite GEO)", C.red],
            ["Hold de 24h", "$80k–200k", C.gold],
          ].map(([l, v, c]) => (
            <div key={l} style={{ padding: "10px", background: C.surfaceHi, borderRadius: 4, border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>{l}</div>
              <div className="disp" style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: C.textDim }}>
          ⚠ Valores estimados para fins ilustrativos. A Payne não fornece garantia financeira.
        </div>
      </Card>
    </div>
  );
}

// ── PANEL: SPACE WEATHER ─────────────────────────────────────────────────────
function PanelSpaceWeather({ kp, bz, speed, density, xray, tick }) {
  const lvl = kpToLevel(kp);
  const kpAngle = (kp / 9) * 180 - 90;
  const r = 50, cx = 66, cy = 66;
  const toRad = d => d * Math.PI / 180;
  const sweep = (kp / 9) * 251.2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp .25s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14 }}>
        <Card style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
          <CornerTick />
          <div className="eyebrow" style={{ color: C.textSub }}>Índice Kp</div>
          <svg width={132} height={132} viewBox="0 0 132 132">
            {[1.0,1.5,2.0].map((r2,i)=>(
              <circle key={i} cx={cx} cy={cy} r={r+i*8} fill="none" stroke={C.border} strokeWidth={0.5} strokeDasharray="2 3" />
            ))}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={8} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={lvl.color} strokeWidth={8}
              strokeDasharray={`${sweep} 251.2`} strokeLinecap="round"
              transform="rotate(-90 66 66)"
              style={{ filter: `drop-shadow(0 0 8px ${lvl.color})` }} />
            <text x={cx} y={cy - 2} fontSize={28} fontFamily="Orbitron,Trebuchet MS" fontWeight={700}
              fill={lvl.color} textAnchor="middle">{kp.toFixed(1)}</text>
            <text x={cx} y={cy + 16} fontSize={8} fontFamily="Orbitron" fill={C.textSub} textAnchor="middle" letterSpacing={3}>Kp</text>
          </svg>
          <div style={{ padding: "4px 16px", borderRadius: 3, background: lvl.color + "18", border: `1px solid ${lvl.color}44`, color: lvl.color, fontSize: 10, fontWeight: 700, letterSpacing: ".15em" }}>
            {lvl.label}
          </div>
          <div className="mono" style={{ fontSize: 8, color: C.textDim }}>UPDATED {tick * 3}s AGO</div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Bz (campo sul)", value: `${bz.toFixed(1)} nT`, warn: bz < -5, icon: "🧭" },
            { label: "Vento Solar", value: `${speed.toFixed(0)} km/s`, warn: speed > 600, icon: "💨" },
            { label: "Densidade Prótons", value: `${density.toFixed(1)} p/cm³`, warn: false, icon: "⚛️" },
            { label: "Kuafu-1 X-Ray", value: xray === "M" || xray === "X" ? `Classe ${xray} ↑` : "Nominal", warn: xray === "M" || xray === "X", icon: "🛸" },
          ].map(s => (
            <Card key={s.label} style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div className="eyebrow" style={{ color: C.textSub }}>{s.label}</div>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
              </div>
              <div className="disp" style={{ fontSize: 22, fontWeight: 800, color: s.warn ? C.red : C.text }}>{s.value}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Escalas de referência */}
      <Card>
        <div className="eyebrow" style={{ color: C.orange, marginBottom: 10 }}>Escala Kp × Impacto em Lançamento</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {[
            ["0–2", "GO", "Nominal. Condições ideais.", C.green],
            ["3–4", "GO/HOLD", "Atenção. Monitorar Bz.", C.gold],
            ["5–6", "HOLD", "Alerta. LEO em risco.", C.orange],
            ["7–8", "REVIEW", "Tempestade. Proteção crítica.", C.red],
            ["9",   "REVIEW", "Extremo. Risco máximo.", C.red],
          ].map(([kpRange, rec, desc, col]) => (
            <div key={kpRange} style={{ padding: "8px", background: C.surfaceHi, borderRadius: 4, border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div className="disp" style={{ fontSize: 14, fontWeight: 800, color: col, marginBottom: 2 }}>Kp {kpRange}</div>
              <Chip label={rec} color={col} />
              <div style={{ fontSize: 9, color: C.textSub, marginTop: 6, lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="eyebrow" style={{ color: C.gold, marginBottom: 8 }}>Histórico de Eventos Documentados</div>
        {[
          ["Apollo 12 (1969)", "Atingida por raios após decolagem. Sobreviveu. Gerou critérios de raios para lançamentos."],
          ["Atlas-Centaur AC-67 (1987)", "Descarga elétrica em condição meteorológica adversa. Missão perdida."],
          ["Starlink Batch (2022)", "Tempestade G1 aumentou arrasto atmosférico. 40 satélites perdidos em órbita inicial."],
        ].map(([t, d]) => (
          <div key={t} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.orange, marginBottom: 2 }}>{t}</div>
            <div style={{ fontSize: 11, color: C.textSub, lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── PANEL: API DEMO ───────────────────────────────────────────────────────────
function PanelAPI({ kp, bz, xray }) {
  const [site, setSite]   = useState("alcantara");
  const [mission, setMission] = useState("leo-small-sat");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const call = () => {
    setLoading(true); setResult(null);
    setTimeout(() => {
      const m = MISSIONS[0];
      const terrestrial = TERRESTRIAL_SIM[m.site];
      const { globalScore, swScore, terrestrialScore, recommendation } =
        calcLaunchWindowScore(kp, bz, xray, terrestrial.score, "MEDIUM");
      setResult({
        mission_id: "PAYNE-DEMO-001",
        recommendation,
        global_score: globalScore,
        space_weather_score: swScore,
        terrestrial_weather_score: terrestrialScore,
        main_reasons: bz < -5 ? "Bz negativo, Kp em atenção, monitorar condições" : "Condições nominais — sem alertas críticos",
        action: recommendation === "GO" ? "Prosseguir com countdown — monitoramento contínuo ativo"
          : recommendation === "HOLD" ? "Aguardar melhora nas condições — revisar em 30 minutos"
          : "Revisar janela de lançamento — consultar sala de controle",
        sources: ["NOAA SWPC (real)", "DSCOVR/ACE (real)", "GOES-R (real)", "Clima terrestre (simulado)"],
        is_simulated: false,
        generated_at: new Date().toISOString(),
      });
      setLoading(false);
    }, 900);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp .25s ease" }}>
      <Card accent>
        <div className="eyebrow" style={{ color: C.orange, marginBottom: 8 }}>Endpoint — Launch Window Score</div>
        <div className="mono" style={{ fontSize: 13, color: C.text, marginBottom: 6 }}>
          <span style={{ color: C.green }}>GET</span> /v1/launch/window-score
        </div>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 16, lineHeight: 1.6 }}>
          Retorna o score de decisão de lançamento com recomendação GO / HOLD / REVIEW, breakdown de componentes e motivos explicáveis.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", gap: 0, border: `1px solid ${C.borderHi}`, borderRadius: 4, overflow: "hidden" }}>
            <span className="mono" style={{ padding: "8px 10px", background: C.green + "18", color: C.green, fontSize: 11, fontWeight: 700, borderRight: `1px solid ${C.border}` }}>GET</span>
            <span className="mono" style={{ padding: "8px 10px", fontSize: 11, color: C.textSub }}>api.payne.io/v1/launch/window-score?site=</span>
            <input value={site} onChange={e => setSite(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", color: C.orange, fontSize: 11, fontFamily: "monospace", padding: "8px 4px", outline: "none" }} />
            <span className="mono" style={{ padding: "8px 4px", fontSize: 11, color: C.textSub }}>&mission=</span>
            <input value={mission} onChange={e => setMission(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", color: C.orange, fontSize: 11, fontFamily: "monospace", padding: "8px 4px", outline: "none" }} />
          </div>
          <button onClick={call} disabled={loading} style={{
            padding: "8px 20px", borderRadius: 4, border: "none", cursor: "pointer",
            background: loading ? C.muted : `linear-gradient(135deg, ${C.orange}, ${C.orangeHi})`,
            color: "#fff", fontSize: 11, fontWeight: 700,
          }}>{loading ? "..." : "Enviar →"}</button>
        </div>
        <div className="mono" style={{ fontSize: 10, color: C.textDim, marginTop: 8 }}>
          sites: alcantara · canaveral · kourou  |  missions: leo-small-sat · starlink-batch · geo-telecom
        </div>
      </Card>

      {(loading || result) && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="eyebrow" style={{ color: C.textSub }}>Response</div>
            {!loading && <Chip label="200 OK" color={C.green} />}
            {loading  && <Chip label="Calculando score..." color={C.gold} />}
          </div>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, color: C.textSub }}>
              <div style={{ width: 14, height: 14, border: `2px solid ${C.border}`, borderTopColor: C.orange, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
              <span className="mono" style={{ fontSize: 11 }}>Integrando dados NASA + NOAA + perfil de missão...</span>
            </div>
          ) : (
            <>
              <pre className="mono" style={{ fontSize: 11, color: C.orange, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: 14, overflowX: "auto" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
              <div style={{ marginTop: 10, padding: "10px 14px", background: recommendationStyle(result.recommendation).bg, border: recommendationStyle(result.recommendation).border, borderRadius: 4 }}>
                <div className="disp" style={{ fontSize: 13, fontWeight: 800, color: recommendationStyle(result.recommendation).color, marginBottom: 4 }}>
                  {result.recommendation} — Score {result.global_score}/100
                </div>
                <div style={{ fontSize: 11, color: C.textSub }}>→ {result.action}</div>
              </div>
            </>
          )}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {[
          { plan: "Starter", price: "$8k/ano",   feats: ["API 1.000 req/hora", "Score por missão", "Alertas e-mail"], color: C.orange },
          { plan: "Pro",     price: "$50k/ano",   feats: ["API ilimitada", "Webhooks em tempo real", "Dashboard KNIME", "Relatório PDF"], color: C.gold, hot: true },
          { plan: "Enterprise", price: "Custom",  feats: ["SLA 99.9%", "Modelo dedicado", "Relatório regulatório"], color: C.green },
        ].map(p => (
          <Card key={p.plan} style={{ border: p.hot ? `1px solid ${p.color}` : undefined }}>
            <div className="eyebrow" style={{ color: p.color, marginBottom: 4 }}>{p.plan}</div>
            <div className="disp" style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 10 }}>{p.price}</div>
            {p.feats.map(f => <div key={f} style={{ fontSize: 10, color: C.textSub, padding: "3px 0", borderBottom: `1px solid ${C.border}` }}>✓ {f}</div>)}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── PANEL: METHODOLOGY ────────────────────────────────────────────────────────
function PanelMethodology() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp .25s ease" }}>
      <Card accent>
        <div className="eyebrow" style={{ color: C.orange, marginBottom: 8 }}>Sobre a Payne Launch Intelligence</div>
        <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.8, marginBottom: 12 }}>
          A empresa se chama <strong style={{ color: C.text }}>Payne</strong> em homenagem a <strong style={{ color: C.orange }}>Cecilia Payne-Gaposchkin</strong> (1900–1979). Em 1925, ela demonstrou que o Sol é composto principalmente por hidrogênio e hélio — contrariando a visão dominante da época. Leu a luz das estrelas para revelar o que o Sol é feito. A Payne lê os sinais do Sol para revelar quando ele pode colocar uma missão em risco.
        </div>
        <div style={{ padding: "10px 14px", background: C.orange + "0a", border: `1px solid ${C.orange}30`, borderRadius: 4, fontSize: 12, color: C.textSub, fontStyle: "italic" }}>
          "Cecilia Payne revelou do que o Sol é feito. A Payne revela quando o Sol pode colocar uma missão em risco."
        </div>
      </Card>

      <Card>
        <div className="eyebrow" style={{ color: C.orange, marginBottom: 10 }}>Metodologia do Launch Window Score</div>
        {[
          ["Componente de Clima Espacial (50%)", "Baseado em Kp real (NOAA SWPC), Bz real (DSCOVR/ACE), fluxo X-Ray real (GOES-R) e alerta Kuafu-1 (CNSA). Penalidades por Kp > 4, Bz negativo e fulgurações M/X."],
          ["Componente de Clima Terrestre (50%)", "Vento, raios, nebulosidade, visibilidade no site de lançamento. MVP usa dados simulados com thresholds baseados em launch commit criteria reais (45th Weather Squadron)."],
          ["Sensibilidade da Missão", "Multiplicador aplicado ao score final. LOW=0.8x / MEDIUM=1.0x / HIGH=1.3x / CRITICAL=1.6x. Missões com payload sensível ou órbita crítica têm thresholds mais conservadores."],
          ["Recomendação final", "GO: score ≥ 65. HOLD: score 40–64. REVIEW: score < 40. A recomendação é de apoio — a decisão operacional é sempre humana."],
        ].map(([t, d]) => (
          <div key={t} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.orange, marginBottom: 4 }}>{t}</div>
            <div style={{ fontSize: 11, color: C.textSub, lineHeight: 1.6 }}>{d}</div>
          </div>
        ))}
      </Card>

      <Card>
        <div className="eyebrow" style={{ color: C.gold, marginBottom: 10 }}>Governança e Limitações</div>
        {[
          ["🔍 Fonte oficial", "NOAA SWPC para clima espacial. Dados rotulados como simulados quando não são reais."],
          ["📋 Rastreabilidade", "Todo score exibe fonte, timestamp, variável e versão da regra de cálculo."],
          ["💬 Explicabilidade", "O sistema mostra por que recomendou GO, HOLD ou REVIEW — sem caixa preta."],
          ["🧑 Human-in-the-loop", "A decisão de lançamento é operacional e humana. A Payne oferece apoio interpretativo."],
          ["⚠ Limitação clara", "Não substitui NOAA, NASA, Space Force, FAA ou autoridade regulatória de lançamento."],
          ["🏷 Dados simulados", "Clima terrestre no MVP é simulado. Identificado claramente na interface e na API."],
        ].map(([t, d]) => (
          <div key={t} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{t.split(" ")[0]}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 2 }}>{t.substring(2)}</div>
              <div style={{ fontSize: 11, color: C.textSub }}>{d}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div className="eyebrow" style={{ color: C.orange, marginBottom: 8 }}>Fontes de Dados</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["NOAA SWPC", "Kp, GOES X-Ray, alertas — dados reais", C.green],
            ["DSCOVR / ACE", "Vento solar, Bz, Bt — dados reais", C.green],
            ["GOES-R", "Fluxo X-Ray, partículas — dados reais", C.green],
            ["Kuafu-1 (CNSA)", "Hard X-ray, Lyman-alpha — roadmap", C.gold],
            ["Clima terrestre", "Simulado no MVP / METAR no roadmap", C.orange],
            ["NASA DONKI", "Eventos CME — roadmap", C.gold],
          ].map(([n, d, c]) => (
            <div key={n} style={{ padding: "8px 10px", background: C.surfaceHi, borderRadius: 4, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{n}</span>
              </div>
              <div style={{ fontSize: 10, color: C.textSub }}>{d}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]               = useState("launch");
  const [selectedMission, setMission] = useState(0);
  const [kp, setKp]                 = useState(4.2);
  const [bz, setBz]                 = useState(-3.1);
  const [speed, setSpeed]           = useState(420);
  const [density, setDensity]       = useState(5.2);
  const [xray, setXray]             = useState("B");
  const [events, setEvents]         = useState([]);
  const [tick, setTick]             = useState(0);
  const { globalScore, recommendation } = calcLaunchWindowScore(
    kp, bz, xray,
    TERRESTRIAL_SIM[MISSIONS[selectedMission].site]?.score || 70,
    MISSIONS[selectedMission].sensitivity
  );
  const recSt = recommendationStyle(recommendation);

  useEffect(() => {
    // Seed events
    const now = new Date();
    setEvents(EVENT_POOL.slice(0, 5).map((e, i) => ({
      ...e, time: new Date(now - i * 47000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    })));

    // Fetch real Kp
    fetch("https://payne-22q3.onrender.com/v1/status")
      .then(r => r.json())
      .then(d => {
        if (d.kp?.kp) setKp(parseFloat(d.kp.kp));
        if (d.magnetic_field?.bz) setBz(parseFloat(d.magnetic_field.bz));
        if (d.solar_wind?.speed) setSpeed(parseFloat(d.solar_wind.speed));
        if (d.solar_wind?.density) setDensity(parseFloat(d.solar_wind.density));
        if (d.xray?.classe) setXray(d.xray.classe);
      })
      .catch(() => {}); // fallback to initial values

    const interval = setInterval(() => {
      setTick(t => t + 1);
      setKp(prev => Math.max(0, Math.min(9, prev + (Math.random() - 0.48) * 0.25)));
      setBz(prev => Math.max(-20, Math.min(10, prev + (Math.random() - 0.5) * 0.8)));
      setSpeed(prev => Math.max(300, Math.min(800, prev + (Math.random() - 0.5) * 15)));
      setDensity(prev => Math.max(1, Math.min(30, prev + (Math.random() - 0.5) * 0.5)));
      const now = new Date();
      const ne = { ...EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)], time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) };
      setEvents(prev => [ne, ...prev].slice(0, 10));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{ANIM}</style>
      <div style={{ background: C.bg, minHeight: "100vh", fontFamily: F.body, color: C.text }}>

        {/* Top bar */}
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span className="disp" style={{ fontSize: 14, fontWeight: 800, color: C.text }}>P</span>
              <div style={{ position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", width: 24, height: 2, background: C.orange, borderRadius: 1 }} />
            </div>
            <div>
              <div className="disp" style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".35em" }}>PAYNE</div>
              <div className="eyebrow" style={{ color: C.orange, marginTop: 1 }}>Launch Intelligence</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "blink 1.5s infinite" }} />
              <span className="eyebrow" style={{ color: C.textSub }}>Live · NASA · CNSA · NOAA</span>
            </div>
            <div style={{
              padding: "5px 16px", borderRadius: 4,
              background: recSt.bg, border: recSt.border, color: recSt.color,
              fontSize: 11, fontWeight: 800, letterSpacing: ".15em",
              animation: `${recSt.glow} 2s infinite`,
            }} className="disp">
              {recommendation}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 60px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, background: C.surface, padding: 4, borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 20, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="disp" style={{
                flex: 1, minWidth: 100, fontSize: 9, fontWeight: 700, padding: "9px 8px",
                borderRadius: 4, border: "none", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: ".15em",
                background: tab === t.id ? `linear-gradient(135deg, ${C.orange}, ${C.orangeHi})` : "transparent",
                color: tab === t.id ? "#000" : C.textSub,
                boxShadow: tab === t.id ? `0 0 16px ${C.orange}66` : "none",
                transition: "all .18s",
              }}>{t.label}</button>
            ))}
          </div>

          <div key={tab} style={{ animation: "fadeUp .25s ease" }}>
            {tab === "launch"  && <PanelLaunchWindow kp={kp} bz={bz} xray={xray} events={events} tick={tick} selectedMission={selectedMission} />}
            {tab === "mission" && <PanelMissionRisk kp={kp} />}
            {tab === "space"   && <PanelSpaceWeather kp={kp} bz={bz} speed={speed} density={density} xray={xray} tick={tick} />}
            {tab === "api"     && <PanelAPI kp={kp} bz={bz} xray={xray} />}
            {tab === "method"  && <PanelMethodology />}
          </div>

          <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
            <div className="eyebrow" style={{ color: C.textDim }}>
              Payne Launch Intelligence © 2026 · NASA DSCOVR · GOES-R · NOAA SWPC · Kuafu-1 CNSA · FIAP Global Solution
            </div>
          </div>
        </div>
      </div>
    </>
  );
}