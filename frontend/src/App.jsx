import { useState, useEffect, useRef } from "react";

// ── Brand (Payne Visual Identity) ────────────────────────────────────────────
const C = {
  bg:        "#050505",
  surface:   "#0a0d14",
  surfaceHi: "#10131A",
  surfaceHi2:"#161a26",
  border:    "#1a1f2e",
  borderHi:  "#252c3d",

  // Acento principal — laranja Payne
  orange:    "#FF7A1A",
  orangeHi:  "#FF9347",
  orangeSoft:"#FFB07A",
  orangeDim: "#7a3a0f",

  // Aliases retro-compat (mantém todas as referências do código original)
  magenta:   "#FF7A1A",
  violet:    "#FF9347",
  sky:       "#FFB07A",

  // Sinalização
  gold:   "#fbbf24",
  red:    "#f87171",
  green:  "#34d399",

  // Texto
  text:    "#FFFFFF",
  textSub: "#72819E",
  textDim: "#3a4358",
  muted:   "#4a5468",
};

// Tipografia — Orbitron (display, números, títulos) + Inter (texto)
const F = {
  display: "'Orbitron', 'Eurostile', 'Rajdhani', system-ui, sans-serif",
  body:    "'Inter', 'Neue Haas Grotesk', system-ui, -apple-system, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
};

const FONTS_LINK = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

const ANIM = `
${FONTS_LINK}
*{box-sizing:border-box}
body{margin:0;background:${C.bg};font-family:${F.body};-webkit-font-smoothing:antialiased}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px ${C.orange}44}50%{box-shadow:0 0 28px ${C.orange}cc}}
@keyframes ringPulse{0%{transform:scale(.95);opacity:.6}100%{transform:scale(1.15);opacity:0}}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes bar{from{width:0}to{width:var(--w)}}
@keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
.disp{font-family:${F.display};letter-spacing:.08em}
.mono{font-family:${F.mono}}
.eyebrow{font-family:${F.display};text-transform:uppercase;letter-spacing:.22em;font-weight:500;font-size:10px;color:${C.textSub}}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function kpToLevel(kp) {
  if (kp < 3) return { label: "NORMAL",   color: C.green,  bg: "#34d39918" };
  if (kp < 5) return { label: "ELEVADO",  color: C.gold,   bg: "#fbbf2418" };
  if (kp < 7) return { label: "ALERTA",   color: C.orange, bg: "#FF7A1A22" };
  return              { label: "CRÍTICO", color: C.red,    bg: "#f8717122" };
}
function scoreToLevel(s) {
  if (s < 30) return C.green;
  if (s < 55) return C.gold;
  if (s < 75) return C.orange;
  return C.red;
}

// ── Simulated live data ───────────────────────────────────────────────────────
function generateForecast(baseKp) {
  return Array.from({ length: 72 }, (_, i) => {
    const trend = Math.sin(i / 12) * 1.5;
    const noise = (Math.random() - 0.5) * 1.2;
    return Math.max(0, Math.min(9, baseKp + trend + noise));
  });
}
function generateScores(kp) {
  return [
    { asset: "Rede Elétrica",    icon: "⚡", score: Math.min(99, Math.round(kp * 9 + Math.random() * 8)),  action: "Monitorar transformadores de alta tensão" },
    { asset: "Satélites LEO",    icon: "🛰", score: Math.min(99, Math.round(kp * 8 + Math.random() * 10)), action: "Elevar altitude preventivamente (+2km)" },
    { asset: "Rotas Polares",    icon: "✈", score: Math.min(99, Math.round(kp * 7 + Math.random() * 12)), action: "Considerar rota alternativa via Atlântico" },
    { asset: "Sistemas GPS",     icon: "📡", score: Math.min(99, Math.round(kp * 6 + Math.random() * 10)), action: "Ativar backup de sincronização temporal" },
    { asset: "Cabos Submarinos", icon: "🌊", score: Math.min(99, Math.round(kp * 5 + Math.random() * 8)),  action: "Registrar baseline — sem ação necessária" },
  ];
}

// ── Logo (P de Payne) ─────────────────────────────────────────────────────────
function PayneLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" stroke={C.borderHi} strokeWidth="1" />
      <circle cx="32" cy="32" r="22" stroke={C.border} strokeWidth="1" />
      <path d="M44 52 A22 22 0 0 0 20 52" stroke={C.orange} strokeWidth="1.5" fill="none" style={{ filter: `drop-shadow(0 0 6px ${C.orange})` }}/>
      <path d="M26 18 L26 46 M26 18 L36 18 Q42 18 42 26 Q42 32 36 32 L26 32" stroke={C.text} strokeWidth="2.2" fill="none" strokeLinecap="square"/>
      <circle cx="32" cy="52" r="1.5" fill={C.orange} />
    </svg>
  );
}

function Chip({ label, color = C.orange }) {
  return (
    <span className="disp" style={{
      display: "inline-block", padding: "3px 9px", fontSize: 9, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: ".18em",
      border: `1px solid ${color}66`, color, background: `${color}12`, borderRadius: 2,
    }}>{label}</span>
  );
}

function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.surface} 0%, ${C.surfaceHi}cc 100%)`,
      border: `1px solid ${C.border}`,
      borderTop: accent ? `1px solid ${C.orange}88` : `1px solid ${C.border}`,
      borderRadius: 4,
      padding: 18,
      position: "relative",
      animation: "fadeUp .4s ease both",
      ...style,
    }}>{children}</div>
  );
}

function CornerTicks() {
  const s = { position: "absolute", width: 10, height: 10, borderColor: C.orange, borderStyle: "solid" };
  return (
    <>
      <span style={{ ...s, top: -1, left: -1, borderWidth: "1px 0 0 1px" }} />
      <span style={{ ...s, top: -1, right: -1, borderWidth: "1px 1px 0 0" }} />
      <span style={{ ...s, bottom: -1, left: -1, borderWidth: "0 0 1px 1px" }} />
      <span style={{ ...s, bottom: -1, right: -1, borderWidth: "0 1px 1px 0" }} />
    </>
  );
}

// ── KP Gauge (anéis concêntricos estilo Payne) ───────────────────────────────
function KpGauge({ kp }) {
  const lvl = kpToLevel(kp);
  const angle = (kp / 9) * 180 - 90;
  const r = 54, cx = 80, cy = 80;
  const toRad = d => (d * Math.PI) / 180;
  const arcX = (a) => cx + r * Math.cos(toRad(a - 90));
  const arcY = (a) => cy + r * Math.sin(toRad(a - 90));
  const sweep = (kp / 9) * 180;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Anéis decorativos (id visual Payne) */}
        <circle cx={cx} cy={cy} r="74" stroke={C.border} strokeWidth="1" fill="none" />
        <circle cx={cx} cy={cy} r="66" stroke={C.borderHi} strokeWidth="1" fill="none" strokeDasharray="2 4" />
        {/* Background arc */}
        <path d={`M ${arcX(-90)} ${arcY(-90)} A ${r} ${r} 0 1 1 ${arcX(90)} ${arcY(90)}`}
              fill="none" stroke={C.border} strokeWidth={8} strokeLinecap="round" />
        {/* Value arc */}
        {kp > 0 && (
          <path d={`M ${arcX(-90)} ${arcY(-90)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${arcX(sweep - 90)} ${arcY(sweep - 90)}`}
                fill="none" stroke={lvl.color} strokeWidth={8} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px ${lvl.color})` }} />
        )}
        {/* Ticks */}
        {Array.from({ length: 10 }).map((_, i) => {
          const a = -90 + (i * 180) / 9;
          const x1 = cx + 44 * Math.cos(toRad(a - 90));
          const y1 = cy + 44 * Math.sin(toRad(a - 90));
          const x2 = cx + 38 * Math.cos(toRad(a - 90));
          const y2 = cy + 38 * Math.sin(toRad(a - 90));
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.textSub} strokeWidth="1" />;
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={cx + 46 * Math.cos(toRad(angle))} y2={cy + 46 * Math.sin(toRad(angle))}
              stroke={lvl.color} strokeWidth="2" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${lvl.color})` }} />
        <circle cx={cx} cy={cy} r="4" fill={C.bg} stroke={lvl.color} strokeWidth="2" />
        {/* Labels */}
        <text x={arcX(-90) - 2} y={arcY(-90) + 14} fontSize="9" fill={C.textSub} fontFamily={F.display} letterSpacing="1">0</text>
        <text x={arcX(90) - 4} y={arcY(90) + 14} fontSize="9" fill={C.textSub} fontFamily={F.display} letterSpacing="1">9</text>
        {/* Value */}
        <text x={cx} y={cy + 8} fontSize="34" fill={C.text} fontFamily={F.display} fontWeight="700" textAnchor="middle" letterSpacing="2">{kp.toFixed(1)}</text>
        <text x={cx} y={cy + 26} fontSize="8" fill={C.textSub} fontFamily={F.display} textAnchor="middle" letterSpacing="3">INDICE Kp</text>
      </svg>
      <div style={{
        padding: "6px 14px", border: `1px solid ${lvl.color}66`, background: lvl.bg,
        color: lvl.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.22em",
        fontFamily: F.display, textTransform: "uppercase", borderRadius: 2,
        animation: kp >= 7 ? "glow 1.5s infinite" : undefined,
      }}>{lvl.label}</div>
    </div>
  );
}

// ── Forecast Chart ────────────────────────────────────────────────────────────
function ForecastChart({ data, currentKp }) {
  const W = 480, H = 140, PAD = { t: 14, r: 12, b: 22, l: 30 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const xScale = i => PAD.l + (i / (data.length - 1)) * iW;
  const yScale = v => PAD.t + iH - (v / 9) * iH;

  const lines = [3, 5, 7];
  const lineColors = [C.gold, C.orange, C.red];
  const points = data.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" ");
  const area = `${PAD.l},${yScale(0)} ` + points + ` ${xScale(data.length - 1)},${yScale(0)}`;
  const ticks = [0, 12, 24, 36, 48, 60, 72];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.orange} stopOpacity="0.45" />
          <stop offset="100%" stopColor={C.orange} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {lines.map((v, i) => (
        <g key={v}>
          <line x1={PAD.l} y1={yScale(v)} x2={W - PAD.r} y2={yScale(v)} stroke={lineColors[i]} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
          <text x={PAD.l - 6} y={yScale(v) + 3} fontSize="8" fill={lineColors[i]} textAnchor="end" fontFamily={F.display}>{v}</text>
        </g>
      ))}
      <polygon points={area} fill="url(#areaGrad)" />
      <polyline points={points} fill="none" stroke={C.orange} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${C.orange}aa)` }} />
      {/* Current marker */}
      <line x1={xScale(0)} y1={PAD.t} x2={xScale(0)} y2={H - PAD.b} stroke={C.text} strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
      <circle cx={xScale(0)} cy={yScale(currentKp)} r="4" fill={C.bg} stroke={C.orange} strokeWidth="2" />
      {ticks.map(t => (
        <text key={t} x={xScale(t)} y={H - 6} fontSize="8" fill={C.textSub} textAnchor="middle" fontFamily={F.display} letterSpacing="1">{t}H</text>
      ))}
      <text x={xScale(0)} y={PAD.t - 4} fontSize="8" fill={C.orange} textAnchor="middle" fontFamily={F.display} fontWeight="700" letterSpacing="2">AGORA</text>
    </svg>
  );
}

// ── Event log ─────────────────────────────────────────────────────────────────
const EVENTS_POOL = [
  { src: "DSCOVR",         color: C.orangeSoft, msg: "Bz = -4.2 nT → componente sul detectada" },
  { src: "GOES-R",         color: C.orange,     msg: "Fulguração classe C2.1 registrada em AR3615" },
  { src: "Kuafu-1 (CNSA)", color: C.gold,       msg: "Emissão Lyman-alpha elevada — possível CME" },
  { src: "SDO/HMI",        color: C.orangeSoft, msg: "Região ativa AR3615 com campo magnético complexo" },
  { src: "SOHO/LASCO",     color: C.orange,     msg: "CME detectada — velocidade estimada 620 km/s" },
  { src: "DSCOVR",         color: C.orangeSoft, msg: "Velocidade vento solar: 485 km/s (+12%)" },
  { src: "Payne AI",       color: C.text,       msg: "Modelo LSTM atualizado — Kp previsto: ↑ nas próximas 6h" },
  { src: "GOES-R",         color: C.orange,     msg: "Fluxo raios-X: 4.2e-6 W/m² — nível B4" },
  { src: "Kuafu-1 (CNSA)", color: C.gold,       msg: "Hard X-ray peak detectado às 18:22 UTC" },
  { src: "Payne AI",       color: C.text,       msg: "CME earth-directed? Probabilidade: 34%" },
];

function EventLog({ events }) {
  return (
    <div style={{ maxHeight: 280, overflowY: "auto", fontFamily: F.mono, fontSize: 11 }}>
      {events.map((e, i) => (
        <div key={`${e.time}-${i}`} style={{
          display: "grid", gridTemplateColumns: "78px 130px 1fr",
          gap: 10, padding: "8px 0",
          borderBottom: `1px solid ${C.border}`,
          animation: i === 0 ? "slideIn .4s ease both" : undefined,
        }}>
          <span style={{ color: C.textDim }}>{e.time}</span>
          <span style={{ color: e.color, fontWeight: 600, letterSpacing: ".05em" }}>[{e.src}]</span>
          <span style={{ color: C.textSub }}>{e.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Risk Bar ──────────────────────────────────────────────────────────────────
function RiskBar({ score, color }) {
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        height: "100%", background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        width: `${score}%`, animation: "bar .8s ease both",
        boxShadow: `0 0 8px ${color}88`,
        ["--w"]: `${score}%`,
      }} />
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [kp, setKp] = useState(4.2);
  const [forecast, setForecast] = useState(() => generateForecast(4.2));
  const [scores, setScores] = useState(() => generateScores(4.2));
  const [events, setEvents] = useState(() => {
    const now = new Date();
    return EVENTS_POOL.slice(0, 5).map((e, i) => ({
      ...e, time: new Date(now - i * 47000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    }));
  });
  const [tab, setTab] = useState("dashboard");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [tick, setTick] = useState(0);
  const [apiInput, setApiInput] = useState("utility");
  const [apiResult, setApiResult] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTick(t => t + 1);
      setKp(prev => {
        const next = Math.max(0, Math.min(9, prev + (Math.random() - 0.48) * 0.3));
        setForecast(generateForecast(next));
        setScores(generateScores(next));
        return next;
      });
      const now = new Date();
      const ne = {
        ...EVENTS_POOL[Math.floor(Math.random() * EVENTS_POOL.length)],
        time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      setEvents(prev => [ne, ...prev].slice(0, 12));
    }, 3000);
    return () => clearInterval(timerRef.current);
  }, []);

  const lvl = kpToLevel(kp);

  const callAPI = () => {
    setApiLoading(true);
    setApiResult(null);
    setTimeout(() => {
      const sc = scores.find(s => s.asset.toLowerCase().includes(apiInput.toLowerCase())) || scores[0];
      setApiResult({
        status: "ok",
        asset_type: apiInput,
        score: sc.score,
        level: kpToLevel(kp).label,
        kp_current: kp.toFixed(2),
        kp_forecast_6h: (kp + (Math.random() - 0.4) * 1.2).toFixed(2),
        recommendation: sc.action,
        valid_until: new Date(Date.now() + 3600000).toISOString(),
        sources: ["DSCOVR", "GOES-R", "Kuafu-1/CNSA", "SDO"],
      });
      setApiLoading(false);
    }, 900);
  };

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "forecast",  label: "Previsão 72H" },
    { id: "assets",    label: "Ativos" },
    { id: "api",       label: "API Demo" },
  ];

  return (
    <>
      <style>{ANIM}</style>
      <div style={{
        minHeight: "100vh", background: C.bg, color: C.text,
        fontFamily: F.body,
        backgroundImage: `
          radial-gradient(ellipse at 50% 0%, ${C.orange}10 0%, transparent 50%),
          radial-gradient(ellipse at 80% 100%, ${C.surfaceHi} 0%, transparent 60%)
        `,
      }}>
        {/* ── Top bar ───────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
          background: `${C.bg}cc`, backdropFilter: "blur(8px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <PayneLogo size={38} />
            <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 14 }}>
              <div className="disp" style={{ fontSize: 18, fontWeight: 700, letterSpacing: ".35em", color: C.text }}>
                P A Y N E
              </div>
              <div className="eyebrow" style={{ color: C.orange, marginTop: 2 }}>
                Space Weather Platform
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: C.green,
                animation: "blink 1.5s infinite", boxShadow: `0 0 8px ${C.green}`,
              }} />
              <span className="eyebrow" style={{ color: C.textSub }}>
                Live · NASA · CNSA · NOAA
              </span>
            </div>
            <Chip label={lvl.label} color={lvl.color} />
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 80px" }}>
          {/* Tab nav */}
          <div style={{
            display: "flex", gap: 2, marginBottom: 24, padding: 4,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4,
          }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className="disp" style={{
                flex: 1, minWidth: 80, fontSize: 10, fontWeight: 700,
                padding: "10px 12px", borderRadius: 2, border: "none", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: ".18em",
                background: tab === t.id ? `linear-gradient(135deg, ${C.orange}, ${C.orangeHi})` : "transparent",
                color: tab === t.id ? C.bg : C.textSub,
                boxShadow: tab === t.id ? `0 0 18px ${C.orange}66` : "none",
                transition: "all .18s",
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── DASHBOARD ─────────────────────────────────────────── */}
          {tab === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 2fr", gap: 16 }}>
                <Card accent>
                  <CornerTicks />
                  <div className="eyebrow" style={{ marginBottom: 16 }}>Atividade Geomagnética</div>
                  <KpGauge kp={kp} />
                  <div style={{
                    marginTop: 16, textAlign: "center",
                    fontSize: 10, color: C.textDim, fontFamily: F.mono, letterSpacing: ".1em",
                  }}>
                    UPDATED {tick * 3}s AGO
                  </div>
                </Card>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Vento Solar",         value: `${(350 + kp * 28).toFixed(0)}`, unit: "km/s", icon: "💨" },
                    { label: "Bz (sul)",            value: `${(-kp * 1.8 + (Math.random() - 0.5)).toFixed(1)}`, unit: "nT", warn: kp > 4, icon: "🧭" },
                    { label: "Densidade Prótons",   value: `${(4 + kp * 0.8).toFixed(1)}`, unit: "p/cm³", icon: "⚛" },
                    { label: "Kuafu-1 X-Ray",       value: kp > 5 ? "C2.1" : "A4.3", unit: kp > 5 ? "↑" : "—", warn: kp > 5, icon: "🛸" },
                  ].map(s => (
                    <Card key={s.label} style={{ padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <span className="eyebrow">{s.label}</span>
                        <span style={{ fontSize: 14, opacity: .7 }}>{s.icon}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span className="disp" style={{
                          fontSize: 24, fontWeight: 700,
                          color: s.warn ? C.orange : C.text,
                          textShadow: s.warn ? `0 0 12px ${C.orange}88` : "none",
                        }}>{s.value}</span>
                        <span className="mono" style={{ fontSize: 10, color: C.textSub }}>{s.unit}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {kp > 5 && (
                <Card accent style={{
                  borderTop: `1px solid ${C.orange}`,
                  background: `linear-gradient(135deg, ${C.orange}1a, ${C.surfaceHi})`,
                  animation: "fadeUp .4s ease both, glow 2s infinite",
                }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 22, color: C.orange }}>⚠</div>
                    <div style={{ flex: 1 }}>
                      <div className="disp" style={{
                        fontSize: 14, fontWeight: 700, color: C.orange,
                        textTransform: "uppercase", letterSpacing: ".15em", marginBottom: 6,
                      }}>
                        CME Detectada — Impacto Estimado em 18–36h
                      </div>
                      <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
                        Kuafu-1 (CNSA) detectou ejeção de massa coronal com velocidade estimada de 640 km/s.
                        Probabilidade de impacto terrestre: <strong style={{ color: C.text }}>41%</strong>. Monitoramento contínuo ativo.
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div className="eyebrow">Feed de Eventos · Tempo Real</div>
                  <span className="mono" style={{ fontSize: 9, color: C.textDim }}>STREAM ACTIVE</span>
                </div>
                <EventLog events={events} />
              </Card>
            </div>
          )}

          {/* ── FORECAST ──────────────────────────────────────────── */}
          {tab === "forecast" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card accent>
                <CornerTicks />
                <div className="eyebrow" style={{ marginBottom: 6 }}>Modelo Preditivo</div>
                <div className="disp" style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: ".12em", marginBottom: 8 }}>
                  PREVISÃO Kp · 72 HORAS
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 18, lineHeight: 1.6 }}>
                  Modelo LSTM treinado com dados históricos NASA OMNIWeb desde 1963. Atualizado a cada hora.
                </div>
                <ForecastChart data={forecast} currentKp={kp} />
                <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  {[["Kp 3", C.gold, "Atenção"], ["Kp 5", C.orange, "Alerta"], ["Kp 7", C.red, "Crítico"]].map(([l, c, t]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 18, height: 1, background: c, boxShadow: `0 0 4px ${c}` }} />
                      <span className="disp" style={{ fontSize: 10, color: c, letterSpacing: ".15em" }}>{l}</span>
                      <span style={{ fontSize: 11, color: C.textSub }}>· {t}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="eyebrow" style={{ marginBottom: 14 }}>Resumo por Janela</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Próximas 24h", data: forecast.slice(0, 24) },
                    { label: "24h – 48h",    data: forecast.slice(24, 48) },
                    { label: "48h – 72h",    data: forecast.slice(48, 72) },
                  ].map(w => {
                    const max = Math.max(...w.data);
                    const wl = kpToLevel(max);
                    return (
                      <div key={w.label} style={{
                        padding: 16, background: C.surfaceHi, border: `1px solid ${C.border}`,
                        borderLeft: `2px solid ${wl.color}`, borderRadius: 2,
                      }}>
                        <div className="eyebrow" style={{ marginBottom: 10 }}>{w.label}</div>
                        <div className="disp" style={{ fontSize: 32, fontWeight: 700, color: wl.color, letterSpacing: ".05em", lineHeight: 1, textShadow: `0 0 16px ${wl.color}66` }}>
                          {max.toFixed(1)}
                        </div>
                        <div className="mono" style={{ fontSize: 9, color: C.textDim, marginTop: 4, letterSpacing: ".1em" }}>KP MAX</div>
                        <div style={{ marginTop: 10 }}>
                          <Chip label={wl.label} color={wl.color} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ── ASSETS ────────────────────────────────────────────── */}
          {tab === "assets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Avaliação de Risco</div>
                <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
                  Score calculado pelo modelo de classificação com base no Kp previsto para as próximas 72h. Atualizado a cada hora.
                </div>
              </Card>
              {scores.map((s, i) => {
                const color = scoreToLevel(s.score);
                const isSelected = selectedAsset === i;
                return (
                  <Card key={s.asset}
                    style={{ cursor: "pointer", borderLeft: `2px solid ${color}`, padding: 16 }}
                    accent={isSelected}>
                    <div onClick={() => setSelectedAsset(isSelected ? null : i)} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ fontSize: 22 }}>{s.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                          <span className="disp" style={{ fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: ".08em", textTransform: "uppercase" }}>
                            {s.asset}
                          </span>
                          <span className="disp" style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: ".05em" }}>
                            {s.score}<span style={{ fontSize: 10, color: C.textDim }}>/100</span>
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div style={{ flex: 1 }}><RiskBar score={s.score} color={color} /></div>
                          <Chip color={color} label={s.score < 30 ? "Baixo" : s.score < 55 ? "Moderado" : s.score < 75 ? "Alto" : "Crítico"} />
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{
                        marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`,
                        fontSize: 12, color: C.textSub, animation: "fadeUp .3s ease both",
                      }}>
                        <span className="eyebrow" style={{ color: C.orange }}>RECOMENDAÇÃO</span>
                        <div style={{ marginTop: 6, color: C.text, fontSize: 13 }}>→ {s.action}</div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── API DEMO ───────────────────────────────────────────── */}
          {tab === "api" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card accent>
                <CornerTicks />
                <div className="eyebrow" style={{ marginBottom: 8 }}>Endpoint</div>
                <div className="mono" style={{ fontSize: 15, color: C.text, marginBottom: 6 }}>
                  <span style={{ color: C.green }}>GET</span> /v1/risk/<span style={{ color: C.orange }}>{"{asset_type}"}</span>
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 16, lineHeight: 1.6 }}>
                  Simula o endpoint da API Payne. Clientes Pro e Enterprise integram nos próprios sistemas de monitoramento.
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "stretch", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 2, padding: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 10px" }}>
                    <span className="disp" style={{ fontSize: 10, color: C.green, fontWeight: 700, letterSpacing: ".15em" }}>GET</span>
                    <span className="mono" style={{ fontSize: 11, color: C.textSub }}>api.payne.io/v1/risk/</span>
                    <input value={apiInput} onChange={e => setApiInput(e.target.value)}
                      style={{ background: "transparent", border: "none", color: C.orange, fontSize: 11, fontFamily: F.mono, padding: "8px 4px", outline: "none", width: 100 }}
                      placeholder="utility" />
                  </div>
                  <button onClick={callAPI} disabled={apiLoading} className="disp" style={{
                    marginLeft: "auto", padding: "8px 18px",
                    background: `linear-gradient(135deg, ${C.orange}, ${C.orangeHi})`,
                    color: C.bg, border: "none", borderRadius: 2,
                    fontSize: 10, fontWeight: 700, letterSpacing: ".18em",
                    cursor: apiLoading ? "wait" : "pointer", textTransform: "uppercase",
                    boxShadow: `0 0 14px ${C.orange}88`,
                  }}>
                    {apiLoading ? "..." : "Enviar →"}
                  </button>
                </div>
                <div className="mono" style={{ fontSize: 10, color: C.textDim, marginTop: 10 }}>
                  Exemplos: utility · satellite · aviation · gps · submarine
                </div>
              </Card>

              {(apiLoading || apiResult) && (
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div className="eyebrow">Response</div>
                    {!apiLoading && <Chip color={C.green} label="200 OK" />}
                    {apiLoading && <Chip color={C.orange} label="Aguardando..." />}
                  </div>
                  {apiLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 20, color: C.textSub }}>
                      <div style={{
                        width: 14, height: 14, border: `2px solid ${C.border}`,
                        borderTopColor: C.orange, borderRadius: "50%", animation: "spin 0.8s linear infinite",
                      }} />
                      <span className="mono" style={{ fontSize: 11 }}>Consultando modelos...</span>
                    </div>
                  ) : (
                    <pre className="mono" style={{
                      margin: 0, padding: 14, background: C.bg, border: `1px solid ${C.border}`,
                      borderRadius: 2, fontSize: 11, color: C.orangeSoft, overflow: "auto",
                    }}>{JSON.stringify(apiResult, null, 2)}</pre>
                  )}
                  {apiResult && (
                    <div style={{ marginTop: 12, padding: 12, background: C.surfaceHi, border: `1px solid ${C.borderHi}`, borderRadius: 2 }}>
                      <div className="disp" style={{ fontSize: 11, color: scoreToLevel(apiResult.score), fontWeight: 700, letterSpacing: ".1em" }}>
                        SCORE: {apiResult.score}/100 · {apiResult.level}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: C.textSub }}>→ {apiResult.recommendation}</div>
                    </div>
                  )}
                </Card>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  { plan: "Starter",    price: "$8k/ano",  limit: "1.000 req/hora" },
                  { plan: "Pro",        price: "$50k/ano", limit: "Ilimitado + Webhooks", highlight: true },
                  { plan: "Enterprise", price: "Custom",   limit: "SLA 99.9% + Modelo dedicado" },
                ].map(p => (
                  <Card key={p.plan} accent={p.highlight} style={{
                    background: p.highlight ? `linear-gradient(180deg, ${C.orange}15, ${C.surfaceHi})` : undefined,
                  }}>
                    <div className="eyebrow" style={{ color: p.highlight ? C.orange : C.textSub }}>{p.plan}</div>
                    <div className="disp" style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 8, letterSpacing: ".05em" }}>{p.price}</div>
                    <div style={{ fontSize: 11, color: C.textSub, marginTop: 6 }}>{p.limit}</div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            marginTop: 40, paddingTop: 20, borderTop: `1px solid ${C.border}`,
            textAlign: "center",
          }}>
            <div className="eyebrow" style={{ color: C.textDim }}>
              Payne © 2026 · NASA DSCOVR · GOES-R · SDO · SOHO · Kuafu-1 CNSA · FIAP Global Solution
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
