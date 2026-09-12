import { useState, useEffect, useRef } from 'react';
import { QUESTIONS, type Q, type CodingQ, type DebugQ, type Diff } from './questions';

declare global { interface Window { Sk: any } }

// ── PALETTE ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#0f1410', panel: '#182019', border: '#2a352c',
  paper: '#ECE7DA', dim: '#8a9487',
  amber: '#D9A441', teal: '#4E9587', brick: '#C1503F',
  editor: '#0d110e', tealDim: '#355c53', amberDim: '#5c4419',
} as const;

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Role = 'learner' | 'trainer';
type Mode = 'learn' | 'test';
type Screen = 'login' | 'dashboard' | 'setup' | 'exam' | 'results' | 'trainer';

export interface QResult {
  id: string; title: string; type: string; topic: string;
  pass: boolean; attempts: number;
}
export interface Session {
  sid: string; name: string; mode: Mode; score: number; total: number;
  pct: number; date: string; passed: boolean; results: QResult[]; secs: number;
}

// ── LOCAL STORAGE ─────────────────────────────────────────────────────────────
const LS_KEY = 'tt_v3_sessions';
function loadSessions(): Session[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveSession(s: Session): void {
  const all = loadSessions();
  all.unshift(s);
  localStorage.setItem(LS_KEY, JSON.stringify(all.slice(0, 200)));
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function deepEqual(a: any, b: any): boolean {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  return a === b;
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function pyLit(v: any): string {
  if (v === null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(pyLit).join(', ') + ']';
  return JSON.stringify(v);
}
function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function fmtDur(secs: number): string {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function buildHarness(q: CodingQ | DebugQ): string {
  const lines: string[] = [
    'def __j(v):',
    "    if v is None: return 'null'",
    "    if v is True: return 'true'",
    "    if v is False: return 'false'",
    "    if isinstance(v,(int,float)): return str(v)",
    '    if isinstance(v,str):',
    "        e=v.replace(chr(92),chr(92)+chr(92)).replace(chr(34),chr(92)+chr(34)).replace(chr(10),chr(92)+'n')",
    "        return chr(34)+e+chr(34)",
    "    if isinstance(v,(list,tuple)): return '['+','.join([__j(x) for x in v])+']'",
    "    return chr(34)+str(v)+chr(34)",
    '',
    'try:',
    `    ${q.funcName}`,
    "except NameError:",
    "    print('@@NOFUNC@@')",
    'else:',
  ];
  q.tests.forEach((t, i) => {
    const args = t[0].map(pyLit).join(', ');
    lines.push(`    try:`);
    lines.push(`        __r${i}=${q.funcName}(${args})`);
    lines.push(`        print('@@R${i}@@'+__j(__r${i}))`);
    lines.push(`    except Exception as e:`);
    lines.push(`        print('@@E${i}@@'+str(e))`);
  });
  return lines.join('\n');
}

async function runSkulpt(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.Sk) { reject(new Error('Python engine not loaded yet. Try again in a moment.')); return; }
    let out = '';
    try {
      window.Sk.configure({
        output: (t: string) => { out += t; },
        read: (x: string) => {
          if (!window.Sk.builtinFiles?.files?.[x]) throw new Error('File not found: ' + x);
          return window.Sk.builtinFiles.files[x];
        },
        __future__: window.Sk.python3,
      });
      window.Sk.misceval.asyncToPromise(() =>
        window.Sk.importMainWithBody('<stdin>', false, code, true)
      ).then(() => resolve(out)).catch(reject);
    } catch (e) { reject(e); }
  });
}

interface TestRow { args: any[]; expected: any; actual: any; error?: string; pass: boolean; }

async function gradeCodingQ(q: CodingQ | DebugQ, code: string): Promise<{ rows: TestRow[]; hardError: string | null }> {
  const harness = buildHarness(q);
  const full = code + '\n\n' + harness;
  try {
    const output = await runSkulpt(full);
    const lines = output.split('\n').filter(l => l.length > 0);
    if (lines.some(l => l.startsWith('@@NOFUNC@@'))) {
      return { rows: [], hardError: `Function <code>${q.funcName}</code> is not defined. Check the function name matches exactly.` };
    }
    const rows: TestRow[] = q.tests.map((t, i) => {
      const rLine = lines.find(l => l.startsWith(`@@R${i}@@`));
      const eLine = lines.find(l => l.startsWith(`@@E${i}@@`));
      if (rLine) {
        const raw = rLine.slice(`@@R${i}@@`.length);
        let actual;
        try { actual = JSON.parse(raw); } catch { actual = raw; }
        return { args: t[0], expected: t[1], actual, pass: deepEqual(actual, t[1]) };
      }
      const errMsg = eLine ? eLine.slice(`@@E${i}@@`.length) : 'no output';
      return { args: t[0], expected: t[1], actual: null, error: errMsg, pass: false };
    });
    return { rows, hardError: null };
  } catch (err) {
    return { rows: [], hardError: `Runtime error: ${esc(String(err))}` };
  }
}

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────────

function Pill({ text, color = C.teal }: { text: string; color?: string }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem',
      padding: '3px 9px', borderRadius: '999px',
      border: `1px solid ${color}44`, color, background: `${color}11`,
    }}>{text}</span>
  );
}

function Btn({
  children, onClick, disabled, variant = 'primary', small,
}: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; variant?: 'primary' | 'teal' | 'ghost' | 'brick';
  small?: boolean;
}) {
  const bg = variant === 'primary' ? C.amber : variant === 'teal' ? C.teal : variant === 'brick' ? C.brick : 'transparent';
  const fg = variant === 'ghost' ? C.dim : variant === 'teal' ? '#0B1512' : '#1a1000';
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
        fontSize: small ? '0.82rem' : '0.92rem',
        padding: small ? '7px 14px' : '11px 22px',
        borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        background: bg, color: fg,
        border: variant === 'ghost' ? `1px solid ${C.border}` : 'none',
        opacity: disabled ? 0.4 : 1,
        transition: 'filter 0.15s, opacity 0.15s',
        lineHeight: 1,
      }}
      onMouseEnter={e => !disabled && ((e.target as HTMLElement).style.filter = 'brightness(1.1)')}
      onMouseLeave={e => ((e.target as HTMLElement).style.filter = '')}
    >{children}</button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '28px 30px', ...style,
    }}>{children}</div>
  );
}

function Mono({ children, dim, style }: { children: React.ReactNode; dim?: boolean; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: 'JetBrains Mono, monospace', color: dim ? C.dim : undefined, ...style }}>{children}</span>;
}

function Chip({ text }: { text: string }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem',
      padding: '3px 8px', borderRadius: '999px',
      border: `1px solid ${C.border}`, color: C.dim,
    }}>{text}</span>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (name: string, role: Role) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | null>(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: C.bg }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Brand */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: C.amber, letterSpacing: '0.1em', marginBottom: 10 }}>
            KOLKAR NISHA • talk_tonic
          </div>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 700, color: C.paper, lineHeight: 1.2 }}>
            Python Training &<br />Assessment Platform
          </h1>
          <p style={{ marginTop: 10, color: C.dim, fontSize: '0.92rem' }}>
            Learn Python step by step, practise with guidance, and earn your certificate.
          </p>
        </div>

        <Card>
          <label style={{ display: 'block', fontSize: '0.82rem', color: C.dim, marginBottom: 7 }}>
            Your name
          </label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Nisha Kolkar"
            style={{
              width: '100%', background: C.editor, color: C.paper,
              border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '11px 14px', fontFamily: 'inherit', fontSize: '0.95rem',
              outline: 'none', marginBottom: 22,
            }}
            onFocus={e => (e.target.style.borderColor = C.tealDim)}
            onBlur={e => (e.target.style.borderColor = C.border)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && role && onLogin(name.trim(), role)}
          />

          <div style={{ fontSize: '0.82rem', color: C.dim, marginBottom: 10 }}>I am a</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {(['learner', 'trainer'] as Role[]).map(r => (
              <button
                key={r} onClick={() => setRole(r)}
                style={{
                  padding: '16px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${role === r ? C.teal : C.border}`,
                  background: role === r ? `${C.teal}11` : `rgba(255,255,255,0.02)`,
                  transition: 'all 0.15s', color: C.paper,
                }}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>
                  {r === 'learner' ? '📘' : '🎓'}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 3, textTransform: 'capitalize' }}>{r}</div>
                <div style={{ fontSize: '0.78rem', color: C.dim }}>
                  {r === 'learner' ? 'Learn, practise & get certified' : 'View learner progress & results'}
                </div>
              </button>
            ))}
          </div>

          <Btn
            onClick={() => name.trim() && role && onLogin(name.trim(), role)}
            disabled={!name.trim() || !role}
          >
            Continue →
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ── DASHBOARD SCREEN ──────────────────────────────────────────────────────────

function DashboardScreen({
  name, sessions, onStartSetup, onLogout,
}: {
  name: string; sessions: Session[];
  onStartSetup: () => void; onLogout: () => void;
}) {
  const mySessions = sessions.filter(s => s.name.toLowerCase() === name.toLowerCase());
  const best = mySessions.length ? Math.max(...mySessions.map(s => s.pct)) : 0;
  const avg = mySessions.length ? Math.round(mySessions.reduce((a, s) => a + s.pct, 0) / mySessions.length) : 0;
  const passCount = mySessions.filter(s => s.passed).length;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '0 0 80px' }}>
      {/* Top nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: C.amber, letterSpacing: '0.08em' }}>
            KOLKAR NISHA • talk_tonic
          </span>
          <span style={{ marginLeft: 12, fontSize: '0.82rem', color: C.dim }}>Python Platform</span>
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.dim, padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.55rem', fontWeight: 700 }}>Welcome, {name}</h2>
          <p style={{ margin: 0, color: C.dim, fontSize: '0.9rem' }}>
            {mySessions.length === 0 ? 'No sessions yet — start your first one below.' : `${mySessions.length} session${mySessions.length > 1 ? 's' : ''} completed`}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Sessions', value: mySessions.length },
            { label: 'Best score', value: mySessions.length ? best + '%' : '—' },
            { label: 'Avg score', value: mySessions.length ? avg + '%' : '—' },
            { label: 'Passed', value: mySessions.length ? passCount : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', color: C.amber, fontWeight: 700, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: C.dim }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 36 }}>
          <Btn onClick={onStartSetup} variant="teal">Start new session</Btn>
        </div>

        {/* History */}
        {mySessions.length > 0 && (
          <Card>
            <div style={{ fontSize: '0.8rem', color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              Session history
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {mySessions.slice(0, 10).map((s, i) => (
                <div key={s.sid} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '11px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: s.passed ? C.teal : C.brick, marginRight: 8, verticalAlign: 'middle',
                      }} />
                      {s.mode === 'learn' ? 'Learn Mode' : 'Test Mode'} · {s.total} questions
                    </div>
                    <div style={{ fontSize: '0.75rem', color: C.dim, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      {s.date} · {fmtDur(s.secs)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem', color: s.passed ? C.teal : C.amber, fontWeight: 700 }}>
                      {s.score}/{s.total}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: C.dim }}>{s.pct}%</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── SETUP SCREEN ──────────────────────────────────────────────────────────────

function SetupScreen({
  name, onBegin, onBack,
}: {
  name: string; onBegin: (mode: Mode, diff: 'all' | Diff, timerSecs: number) => void; onBack: () => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [diff, setDiff] = useState<'all' | Diff>('all');
  const [timer, setTimer] = useState(0);

  const totalQ = diff === 'all' ? QUESTIONS.length : QUESTIONS.filter(q => q.diff === diff).length;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '0 0 80px' }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: '0.88rem' }}>← Back</button>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: C.amber }}>KOLKAR NISHA • talk_tonic</span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 24px' }}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Configure your session</h2>
        <p style={{ color: C.dim, marginBottom: 32, fontSize: '0.9rem' }}>Learner: <strong style={{ color: C.paper }}>{name}</strong></p>

        {/* Mode */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: '0.8rem', color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Mode</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              { m: 'learn' as Mode, label: '📘 Learn Mode', desc: 'Immediate feedback after each attempt. Retries allowed. Explanations and reference solutions always visible.' },
              { m: 'test' as Mode, label: '🎯 Test Mode', desc: 'Exam conditions. Submit first — answers unlock only after submission. One scored attempt per question.' },
            ]).map(({ m, label, desc }) => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '16px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${mode === m ? C.teal : C.border}`,
                background: mode === m ? `${C.teal}11` : `rgba(255,255,255,0.02)`,
                color: C.paper, transition: 'all 0.15s',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: '0.78rem', color: C.dim, lineHeight: 1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: '0.8rem', color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Difficulty</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'Beginner', 'Intermediate', 'Advanced'] as const).map(d => (
              <button key={d} onClick={() => setDiff(d)} style={{
                padding: '8px 16px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${diff === d ? C.amber : C.border}`,
                background: diff === d ? `${C.amber}11` : 'transparent', color: diff === d ? C.amber : C.dim, fontSize: '0.88rem', fontWeight: 500,
              }}>{d === 'all' ? 'All levels' : d}</button>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.8rem', color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Timer</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([{ v: 0, l: 'No timer' }, { v: 1800, l: '30 min' }, { v: 2700, l: '45 min' }, { v: 3600, l: '60 min' }]).map(({ v, l }) => (
              <button key={v} onClick={() => setTimer(v)} style={{
                padding: '8px 16px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${timer === v ? C.amber : C.border}`,
                background: timer === v ? `${C.amber}11` : 'transparent', color: timer === v ? C.amber : C.dim, fontSize: '0.88rem', fontWeight: 500,
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Summary note */}
        <div style={{ padding: '12px 16px', borderLeft: `3px solid ${C.amber}`, background: `${C.amber}08`, borderRadius: '0 8px 8px 0', marginBottom: 28, fontSize: '0.85rem', color: C.dim }}>
          <strong style={{ color: C.paper }}>Session:</strong> {totalQ} question{totalQ !== 1 ? 's' : ''} · {diff === 'all' ? 'All difficulties' : diff} · {mode === 'learn' ? 'Learn Mode' : mode === 'test' ? 'Test Mode' : 'select a mode'} · {timer === 0 ? 'No timer' : fmtTime(timer)}
        </div>

        <Btn onClick={() => mode && onBegin(mode, diff, timer)} disabled={!mode} variant="teal">
          Begin session →
        </Btn>
      </div>
    </div>
  );
}

// ── EXAM SCREEN ───────────────────────────────────────────────────────────────

interface FeedbackState {
  passed: boolean;
  hardError: string | null;
  rows: TestRow[];
  mcqSelected: number | null;
  outputGuess: string;
}

interface TestRow { args: any[]; expected: any; actual: any; error?: string; pass: boolean; }

function TrainerTip(q: Q, rows: TestRow[], hardError: string | null): string {
  if (hardError) return 'Fix the error shown above before checking logic. Run again after the code executes without crashing.';
  const failed = rows.filter(r => !r.pass);
  if (!failed.length) return `Excellent — all test cases passed. Core skill: ${q.topic}.`;
  const r = failed[0];
  if (r.error) {
    if (/NameError/i.test(r.error)) return 'Trainer tip: a variable or function name is missing or spelt differently.';
    if (/TypeError/i.test(r.error)) return 'Trainer tip: check the data type and the operation applied to it.';
    if (/IndexError/i.test(r.error)) return 'Trainer tip: a list or string index is out of the valid range.';
    if (/ZeroDivision/i.test(r.error)) return 'Trainer tip: make sure your divisor cannot become zero.';
    return 'Trainer tip: read the error message from the first failing test case and trace that input step by step.';
  }
  return `Trainer tip: the logic is not correct for at least one case. Expected ${JSON.stringify(r.expected)} but got ${JSON.stringify(r.actual)}. Trace your loop or condition one step at a time.`;
}

function ExamScreen({
  questions, mode, timerSecs, learnerName, onFinish,
}: {
  questions: Q[]; mode: Mode; timerSecs: number; learnerName: string;
  onFinish: (results: QResult[], secs: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<QResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(timerSecs);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [running, setRunning] = useState(false);

  // Per-question answer state
  const [codeVal, setCodeVal] = useState('');
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [outputGuess, setOutputGuess] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<number | null>(null);
  const startTimeRef = useRef(Date.now());
  const resultsRef = useRef<QResult[]>([]);
  const idxRef = useRef(0);
  const questionsRef = useRef(questions);

  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const score = results.filter(r => r.pass).length;
  const pct = Math.round((score / Math.max(results.length, 1)) * 100);

  // Sync refs
  useEffect(() => { resultsRef.current = results; }, [results]);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  // Timer
  useEffect(() => {
    if (timerSecs === 0) return;
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(iv);
          const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
          const finalResults = questionsRef.current.map((qq, i) =>
            resultsRef.current[i] || { id: qq.id, title: qq.title, type: qq.type, topic: qq.topic, pass: false, attempts: 0 }
          );
          onFinish(finalResults, elapsed);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Reset per-question state when idx changes
  useEffect(() => {
    setFeedback(null);
    setSubmitted(false);
    setAttempts(0);
    setSelectedOpt(null);
    setOutputGuess('');
    const q = questions[idx];
    if (q.type === 'coding') setCodeVal(q.starter);
    else if (q.type === 'debug') setCodeVal(q.broken);
    else setCodeVal('');
  }, [idx]);

  // Restore cursor after Tab
  useEffect(() => {
    if (cursorRef.current !== null && textareaRef.current) {
      textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorRef.current;
      cursorRef.current = null;
    }
  }, [codeVal]);

  async function handleSubmit() {
    if (running) return;
    if (submitted && mode === 'test') return;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setRunning(true);

    let passed = false;
    let fb: FeedbackState = { passed: false, hardError: null, rows: [], mcqSelected: null, outputGuess: '' };

    if (q.type === 'mcq') {
      passed = selectedOpt === q.correct;
      fb = { passed, hardError: null, rows: [], mcqSelected: selectedOpt, outputGuess: '' };
    } else if (q.type === 'output') {
      const guess = outputGuess.trim();
      passed = guess === q.expected.trim();
      fb = { passed, hardError: null, rows: [], mcqSelected: null, outputGuess: guess };
    } else if (q.type === 'coding' || q.type === 'debug') {
      const { rows, hardError } = await gradeCodingQ(q as CodingQ | DebugQ, codeVal);
      passed = !hardError && rows.length > 0 && rows.every(r => r.pass);
      fb = { passed, hardError, rows, mcqSelected: null, outputGuess: '' };
    }

    setRunning(false);
    setFeedback(fb);

    const qr: QResult = { id: q.id, title: q.title, type: q.type, topic: q.topic, pass: passed, attempts: newAttempts };

    if (mode === 'test' && !submitted) {
      setResults(prev => {
        const next = prev.filter(r => r.id !== q.id);
        return [...next, qr];
      });
    } else if (mode === 'learn') {
      setResults(prev => {
        const next = prev.filter(r => r.id !== q.id);
        return [...next, qr];
      });
    }

    setSubmitted(true);
  }

  function handleRetry() {
    setFeedback(null);
    setSubmitted(false);
    setSelectedOpt(null);
    setOutputGuess('');
  }

  function handleNext() {
    // Ensure current question has a result even if skipped
    const hasResult = results.some(r => r.id === q.id);
    let finalResults = results;
    if (!hasResult) {
      const skipped: QResult = { id: q.id, title: q.title, type: q.type, topic: q.topic, pass: false, attempts: 0 };
      finalResults = [...results, skipped];
      setResults(finalResults);
    }

    if (isLast) {
      // Fill in any unanswered questions
      const complete = questions.map(qq => {
        const r = finalResults.find(r => r.id === qq.id);
        return r || { id: qq.id, title: qq.title, type: qq.type, topic: qq.topic, pass: false, attempts: 0 };
      });
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      onFinish(complete, elapsed);
    } else {
      setIdx(i => i + 1);
    }
  }

  function handleTabInTextarea(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);
    cursorRef.current = start + 4;
    setCodeVal(before + '    ' + after);
  }

  const progressPct = Math.round((idx / questions.length) * 100);
  const timerWarning = timerSecs > 0 && timeLeft < 120;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: C.bg, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Pill text={mode === 'learn' ? 'LEARN' : 'TEST'} color={mode === 'learn' ? C.teal : C.amber} />
          <Mono dim>Q {idx + 1} / {questions.length}</Mono>
          {mode === 'learn' && results.length > 0 && (
            <Mono dim>Score {score}/{results.length}</Mono>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {timerSecs > 0 && (
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem',
              color: timerWarning ? C.brick : C.dim,
              animation: timerWarning ? 'pulse 1.2s infinite' : 'none',
            }}>
              ⏱ {fmtTime(timeLeft)}
            </div>
          )}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: C.amber, letterSpacing: '0.07em' }}>
            talk_tonic
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: C.border, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: C.teal, width: progressPct + '%', transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '30px 24px' }}>
        <Card>
          {/* Meta row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip text={q.type.toUpperCase()} />
              <Chip text={q.diff} />
              <Chip text={q.topic} />
            </div>
            <Mono dim style={{ fontSize: '0.72rem' }}>{q.id.toUpperCase()}</Mono>
          </div>

          {/* Title + prompt */}
          <h2 style={{ margin: '0 0 10px', fontSize: '1.18rem', fontWeight: 600, color: '#F5F2E8' }}>{q.title}</h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.92rem', color: C.dim, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: q.prompt }} />

          {/* Examples (coding only) */}
          {q.type === 'coding' && q.examples.length > 0 && (
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: C.dim,
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '12px 16px', marginBottom: 18,
            }}>
              {q.examples.map((ex, i) => <div key={i}>{ex}</div>)}
            </div>
          )}

          {/* Code for output prediction */}
          {q.type === 'output' && (
            <pre style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem',
              background: C.editor, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '16px 18px', margin: '0 0 18px', color: '#D8D3C4',
              overflow: 'auto', lineHeight: 1.55,
            }}>{q.code}</pre>
          )}

          {/* Broken code for debug */}
          {q.type === 'debug' && (
            <div style={{
              padding: '12px 16px', borderLeft: `3px solid ${C.brick}`, background: `${C.brick}08`,
              borderRadius: '0 8px 8px 0', fontSize: '0.82rem', color: C.dim, marginBottom: 16,
            }}>
              {mode === 'learn'
                ? <><strong style={{ color: C.paper }}>Bug hint:</strong> {q.bugHint}</>
                : <><strong style={{ color: C.paper }}>Your task:</strong> Find and fix the bug in the code below.</>
              }
            </div>
          )}

          {/* Learn mode: learning goal */}
          {mode === 'learn' && !submitted && (
            <div style={{ padding: '12px 16px', borderLeft: `3px solid ${C.teal}`, background: `${C.teal}08`, borderRadius: '0 8px 8px 0', fontSize: '0.83rem', color: C.dim, marginBottom: 18 }}>
              <strong style={{ color: C.paper }}>Learning goal:</strong> {q.goal}
            </div>
          )}

          {/* Test mode: exam reminder */}
          {mode === 'test' && !submitted && (
            <div style={{ padding: '10px 14px', borderLeft: `3px solid ${C.amber}`, background: `${C.amber}08`, borderRadius: '0 8px 8px 0', fontSize: '0.8rem', color: C.dim, marginBottom: 18 }}>
              <strong style={{ color: C.paper }}>Exam rule:</strong> Submit your answer first — the reference solution unlocks after submission.
            </div>
          )}

          {/* ── MCQ ── */}
          {q.type === 'mcq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {q.options.map((opt, i) => {
                const isSelected = selectedOpt === i;
                const isCorrect = submitted && i === q.correct;
                const isWrong = submitted && isSelected && i !== q.correct;
                return (
                  <button
                    key={i}
                    disabled={submitted && mode === 'test'}
                    onClick={() => !submitted && setSelectedOpt(i)}
                    style={{
                      textAlign: 'left', padding: '12px 16px', borderRadius: 8, cursor: submitted && mode === 'test' ? 'default' : 'pointer',
                      border: `1px solid ${isCorrect ? C.teal : isWrong ? C.brick : isSelected ? C.amber : C.border}`,
                      background: isCorrect ? `${C.teal}15` : isWrong ? `${C.brick}15` : isSelected ? `${C.amber}11` : 'rgba(255,255,255,0.02)',
                      color: C.paper, fontSize: '0.9rem', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: isCorrect ? C.teal : isWrong ? C.brick : C.dim, marginRight: 10 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: opt }} />
                    {isCorrect && <span style={{ marginLeft: 8, color: C.teal, fontSize: '0.82rem' }}>✓ correct</span>}
                    {isWrong && <span style={{ marginLeft: 8, color: C.brick, fontSize: '0.82rem' }}>✗</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── OUTPUT PREDICTION ── */}
          {q.type === 'output' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: C.dim, marginBottom: 8 }}>
                Your predicted output:
              </label>
              <textarea
                value={outputGuess}
                onChange={e => setOutputGuess(e.target.value)}
                readOnly={submitted && mode === 'test'}
                placeholder="Type exactly what you think this code prints..."
                rows={4}
                style={{
                  width: '100%', background: C.editor, color: C.paper,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.88rem', outline: 'none', resize: 'vertical', lineHeight: 1.5,
                }}
                onFocus={e => (e.target.style.borderColor = C.tealDim)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>
          )}

          {/* ── CODING / DEBUG EDITOR ── */}
          {(q.type === 'coding' || q.type === 'debug') && (
            <div style={{ marginBottom: 20 }}>
              <textarea
                ref={textareaRef}
                value={codeVal}
                onChange={e => setCodeVal(e.target.value)}
                onKeyDown={handleTabInTextarea}
                readOnly={submitted && mode === 'test'}
                spellCheck={false}
                style={{
                  width: '100%', minHeight: 200, background: C.editor, color: '#E7E2D2',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem', lineHeight: 1.6,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '14px 16px', resize: 'vertical', outline: 'none', tabSize: 4,
                }}
                onFocus={e => (e.target.style.borderColor = C.tealDim)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>
          )}

          {/* Running indicator */}
          {running && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.82rem', color: C.dim, fontFamily: 'JetBrains Mono, monospace' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.amber, display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
              Running code…
            </div>
          )}

          {/* Action buttons */}
          {!submitted ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(q.type === 'coding' || q.type === 'debug') && (
                  <Btn
                    variant="ghost" small
                    onClick={() => setCodeVal(q.type === 'coding' ? q.starter : q.broken)}
                  >Reset</Btn>
                )}
              </div>
              <Btn
                onClick={handleSubmit}
                disabled={
                  running ||
                  (q.type === 'mcq' && selectedOpt === null) ||
                  (q.type === 'output' && !outputGuess.trim())
                }
              >
                {q.type === 'mcq' ? 'Submit answer' : q.type === 'output' ? 'Submit prediction' : 'Run & submit →'}
              </Btn>
            </div>
          ) : null}
        </Card>

        {/* ── FEEDBACK ── */}
        {feedback && submitted && (
          <div className="animate-rise" style={{
            marginTop: 16, background: C.panel,
            border: `1px solid ${feedback.passed ? C.tealDim : '#6b342c'}`,
            borderRadius: 12, padding: '22px 28px',
            boxShadow: `0 0 0 1px ${feedback.passed ? C.teal : C.brick}22`,
          }}>
            {/* Verdict */}
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 14, color: feedback.passed ? C.teal : C.brick }}>
              {feedback.passed ? '✓ Correct' : '✗ Incorrect'}
              {feedback.rows.length > 0 && !feedback.hardError && (
                <span style={{ fontWeight: 400, fontSize: '0.82rem', color: C.dim, marginLeft: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                  {feedback.rows.filter(r => r.pass).length}/{feedback.rows.length} tests passed
                </span>
              )}
            </div>

            {/* Hard error */}
            {feedback.hardError && (
              <div style={{ fontSize: '0.88rem', color: C.dim, marginBottom: 14 }}
                dangerouslySetInnerHTML={{ __html: feedback.hardError }} />
            )}

            {/* Test rows (coding/debug) */}
            {feedback.rows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {feedback.rows.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '7px 0', alignItems: 'flex-start',
                    borderTop: i > 0 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem',
                  }}>
                    <span style={{ color: r.pass ? C.teal : C.brick, fontWeight: 700, flexShrink: 0 }}>
                      {r.pass ? 'PASS' : 'FAIL'}
                    </span>
                    <span style={{ color: C.dim }}>
                      {(q as CodingQ).funcName}({r.args.map(a => JSON.stringify(a)).join(', ')})
                      {' → '}expected <strong style={{ color: C.paper }}>{JSON.stringify(r.expected)}</strong>
                      {r.error
                        ? <>, raised <strong style={{ color: C.brick }}>{r.error}</strong></>
                        : !r.pass && <>, got <strong style={{ color: C.brick }}>{JSON.stringify(r.actual)}</strong></>
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Output prediction result */}
            {q.type === 'output' && feedback.outputGuess !== undefined && (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: C.dim, marginBottom: 14 }}>
                Your answer: <strong style={{ color: feedback.passed ? C.teal : C.brick }}>{feedback.outputGuess || '(blank)'}</strong>
                {!feedback.passed && <> · Expected: <strong style={{ color: C.paper }}>{(q as any).expected}</strong></>}
              </div>
            )}

            {/* MCQ: which was correct */}
            {q.type === 'mcq' && !feedback.passed && (
              <div style={{ fontSize: '0.85rem', color: C.dim, marginBottom: 12 }}>
                Correct answer: <strong style={{ color: C.teal }}>{String.fromCharCode(65 + q.correct)}. {q.options[q.correct]}</strong>
              </div>
            )}

            {/* Learn mode: trainer tip */}
            {mode === 'learn' && (
              <div style={{ padding: '12px 14px', borderLeft: `3px solid ${C.amber}`, background: `${C.amber}08`, borderRadius: '0 8px 8px 0', fontSize: '0.83rem', color: C.dim, marginBottom: 16 }}>
                <strong style={{ color: C.paper }}>Trainer:</strong>{' '}
                {q.type === 'mcq' || q.type === 'output'
                  ? (feedback.passed ? `Excellent. Concept: ${q.concept}.` : `Review the explanation below and try again if you like.`)
                  : TrainerTip(q, feedback.rows, feedback.hardError)
                }
              </div>
            )}

            {/* Reference solution / explanation */}
            {(mode === 'learn' || submitted) && (
              <details open={mode === 'learn'} style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                <summary style={{
                  cursor: 'pointer', padding: '11px 14px', fontSize: '0.85rem', fontWeight: 600,
                  color: C.amber, background: `${C.amber}08`, listStyle: 'none',
                }}>
                  {mode === 'learn' ? '▾ Reference solution + explanation' : '▾ Reference solution (unlocked after submission)'}
                </summary>
                {(q.type === 'coding' || q.type === 'debug') && (
                  <pre style={{
                    margin: 0, padding: '14px 16px', background: C.editor,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.84rem',
                    color: '#D8D3C4', overflow: 'auto',
                  }}>
                    {q.type === 'coding' ? q.reference : q.fixed}
                  </pre>
                )}
                <div style={{ padding: '13px 16px', fontSize: '0.86rem', color: C.dim, lineHeight: 1.6, borderTop: `1px solid ${C.border}` }}
                  dangerouslySetInnerHTML={{ __html: q.explanation }} />
              </details>
            )}

            {/* Learn mode: explanation always visible right away */}
            {mode === 'learn' && !feedback.passed && (
              <div style={{ fontSize: '0.84rem', color: C.dim, marginBottom: 14 }}>
                <strong style={{ color: C.paper }}>What to do next:</strong> Read the failed case, trace your logic step by step, then retry.
              </div>
            )}

            {/* Buttons row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div>
                {mode === 'learn' && (
                  <Btn variant="ghost" small onClick={handleRetry}>Retry this question</Btn>
                )}
              </div>
              <Btn variant="teal" onClick={handleNext}>
                {isLast ? 'See results →' : 'Next question →'}
              </Btn>
            </div>
          </div>
        )}

        {/* Skip (if not submitted) */}
        {!submitted && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button
              onClick={handleNext}
              style={{ background: 'none', border: 'none', color: C.dim, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Skip this question →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RESULTS SCREEN ────────────────────────────────────────────────────────────

const PASS_PCT = 70;

function ResultsScreen({
  session, onRestart, onDashboard,
}: {
  session: Session; onRestart: () => void; onDashboard: () => void;
}) {
  const { name, mode, score, total, pct, passed, results, date, sid } = session;
  const certRef = useRef<HTMLDivElement>(null);

  const mastered = [...new Set(results.filter(r => r.pass).map(r => r.topic))];
  const needsPractice = [...new Set(results.filter(r => !r.pass).map(r => r.topic))];

  const byType: Record<string, { pass: number; fail: number }> = {};
  results.forEach(r => {
    if (!byType[r.type]) byType[r.type] = { pass: 0, fail: 0 };
    r.pass ? byType[r.type].pass++ : byType[r.type].fail++;
  });

  function handlePrint() { window.print(); }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: C.amber }}>KOLKAR NISHA • talk_tonic</span>
        <button onClick={onDashboard} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.dim, padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
          Dashboard
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px' }}>
        {/* Hero score */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Pill text={mode === 'test' ? 'Assessment Complete' : 'Training Complete'} />
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '3rem', color: C.amber, margin: '16px 0 6px', fontWeight: 700 }}>
            {score} / {total}
          </div>
          <p style={{ color: C.dim, margin: '0 0 8px', fontSize: '0.95rem' }}>
            <strong style={{ color: C.paper }}>{pct}%</strong>
            {mode === 'test' ? ' assessment score' : ' mastery score'}
            {' · '}
            <span style={{ color: passed ? C.teal : C.brick }}>{passed ? '✓ Passed' : '✗ Not yet'}</span>
          </p>
        </div>

        {/* Analysis grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <Card style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Strengths</div>
            {mastered.slice(0, 5).map(t => (
              <div key={t} style={{ fontSize: '0.85rem', color: C.teal, marginBottom: 4 }}>✓ {t}</div>
            ))}
            {mastered.length === 0 && <div style={{ fontSize: '0.82rem', color: C.dim }}>Complete more questions to identify strengths.</div>}
          </Card>
          <Card style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Needs practice</div>
            {needsPractice.slice(0, 5).map(t => (
              <div key={t} style={{ fontSize: '0.85rem', color: C.amber, marginBottom: 4 }}>• {t}</div>
            ))}
            {needsPractice.length === 0 && <div style={{ fontSize: '0.82rem', color: C.dim }}>No weak areas — excellent work!</div>}
          </Card>
        </div>

        {/* By question type */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.72rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Performance by question type</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(byType).map(([type, stat]) => {
              const typePct = Math.round((stat.pass / (stat.pass + stat.fail)) * 100);
              return (
                <div key={type} style={{ flex: '1 1 120px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: C.dim, textTransform: 'uppercase', marginBottom: 6 }}>{type}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.2rem', color: typePct >= 70 ? C.teal : C.brick, fontWeight: 700 }}>{typePct}%</div>
                  <div style={{ fontSize: '0.75rem', color: C.dim }}>{stat.pass}/{stat.pass + stat.fail} correct</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Question breakdown */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.72rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Question breakdown</div>
          {results.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.pass ? C.teal : C.brick, display: 'inline-block', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{r.title}</div>
                  <div style={{ fontSize: '0.72rem', color: C.dim, fontFamily: 'JetBrains Mono, monospace' }}>{r.type} · {r.topic}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {r.attempts > 0 && mode === 'learn' && (
                  <span style={{ fontSize: '0.72rem', color: C.dim, fontFamily: 'JetBrains Mono, monospace' }}>{r.attempts} attempt{r.attempts > 1 ? 's' : ''}</span>
                )}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: r.pass ? C.teal : C.brick, fontWeight: 700 }}>
                  {r.pass ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          ))}
        </Card>

        {/* Certificate */}
        {mode === 'test' && passed && (
          <div ref={certRef} style={{
            border: `2px solid ${C.amber}`, borderRadius: 12,
            padding: '36px 30px', background: '#141a15',
            textAlign: 'center', marginBottom: 20, position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: `6px solid ${C.amber}22`, borderRadius: 10, pointerEvents: 'none', margin: 6 }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: C.amber, letterSpacing: '0.14em', marginBottom: 12 }}>
              KOLKAR NISHA • talk_tonic
            </div>
            <div style={{ fontSize: '0.9rem', color: C.dim, marginBottom: 6 }}>Certificate of Achievement</div>
            <div style={{ fontSize: '0.85rem', color: C.dim }}>This certifies that</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: C.paper, margin: '12px 0', letterSpacing: '-0.01em' }}>{name}</div>
            <div style={{ fontSize: '0.88rem', color: C.dim, marginBottom: 4 }}>has successfully completed the</div>
            <div style={{ fontWeight: 700, fontSize: '1.02rem', marginBottom: 14 }}>Python Training & Assessment</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', color: C.teal, marginBottom: 14 }}>
              Score: {score}/{total} · {pct}%
            </div>
            <div style={{ fontSize: '0.75rem', color: C.dim, fontFamily: 'JetBrains Mono, monospace' }}>
              Certificate ID: {sid.toUpperCase()} · Issued: {date}
            </div>
            <div style={{ marginTop: 12, fontSize: '0.75rem', color: C.dim }}>
              Issued by KOLKAR NISHA, talk_tonic platform
            </div>
          </div>
        )}

        {mode === 'test' && passed && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Btn onClick={handlePrint} variant="ghost" small>🖨 Print certificate</Btn>
          </div>
        )}

        {mode === 'test' && !passed && (
          <div style={{ textAlign: 'center', padding: '20px', color: C.dim, fontSize: '0.88rem', marginBottom: 16 }}>
            Score {PASS_PCT}% or above in Test Mode to earn your certificate. You scored {pct}%.
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Btn onClick={onDashboard} variant="ghost">Back to dashboard</Btn>
          <Btn onClick={onRestart} variant="teal">New session →</Btn>
        </div>
      </div>
    </div>
  );
}

// ── TRAINER DASHBOARD ─────────────────────────────────────────────────────────

function TrainerScreen({
  trainerName, sessions, onLogout,
}: {
  trainerName: string; sessions: Session[]; onLogout: () => void;
}) {
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | Mode>('all');

  const filtered = sessions.filter(s => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase());
    const matchMode = modeFilter === 'all' || s.mode === modeFilter;
    return matchName && matchMode;
  });

  const uniqueLearners = new Set(sessions.map(s => s.name)).size;
  const passRate = sessions.length ? Math.round(sessions.filter(s => s.passed).length / sessions.length * 100) : 0;
  const avgScore = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.pct, 0) / sessions.length) : 0;

  // Per-question stats from all sessions
  const qStats: Record<string, { title: string; pass: number; total: number; type: string }> = {};
  sessions.forEach(s => {
    s.results.forEach(r => {
      if (!qStats[r.id]) qStats[r.id] = { title: r.title, pass: 0, total: 0, type: r.type };
      qStats[r.id].total++;
      if (r.pass) qStats[r.id].pass++;
    });
  });
  const sortedQStats = Object.entries(qStats).sort((a, b) => (a[1].pass / a[1].total) - (b[1].pass / b[1].total));

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: C.amber }}>KOLKAR NISHA • talk_tonic</span>
          <span style={{ marginLeft: 12, fontSize: '0.82rem', color: C.dim }}>Trainer Dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: C.dim }}>{trainerName}</span>
          <button onClick={onLogout} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.dim, padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ marginTop: 0, marginBottom: 24 }}>Platform Overview</h2>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Total sessions', value: sessions.length },
            { label: 'Unique learners', value: uniqueLearners },
            { label: 'Pass rate', value: sessions.length ? passRate + '%' : '—' },
            { label: 'Avg score', value: sessions.length ? avgScore + '%' : '—' },
          ].map(s => (
            <div key={s.label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', color: C.amber, fontWeight: 700, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: C.dim }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Hardest questions */}
        {sortedQStats.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.72rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Questions by pass rate (hardest first)</div>
            {sortedQStats.slice(0, 8).map(([id, stat]) => {
              const qPct = Math.round((stat.pass / stat.total) * 100);
              return (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                  <div>
                    <span style={{ fontSize: '0.88rem' }}>{stat.title}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: C.dim, marginLeft: 8 }}>{stat.type}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 80, height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: qPct + '%', height: '100%', background: qPct >= 70 ? C.teal : qPct >= 40 ? C.amber : C.brick, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: qPct >= 70 ? C.teal : C.brick, minWidth: 36, textAlign: 'right' }}>
                      {qPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {/* Sessions table */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.72rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              All sessions ({filtered.length})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name..."
                style={{
                  background: C.editor, color: C.paper, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '6px 10px', fontFamily: 'inherit', fontSize: '0.82rem', outline: 'none',
                }}
              />
              {(['all', 'learn', 'test'] as const).map(m => (
                <button key={m} onClick={() => setModeFilter(m)} style={{
                  padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem',
                  border: `1px solid ${modeFilter === m ? C.teal : C.border}`,
                  background: modeFilter === m ? `${C.teal}11` : 'transparent',
                  color: modeFilter === m ? C.teal : C.dim,
                }}>{m}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.dim, fontSize: '0.88rem' }}>
              No sessions yet. Learner sessions will appear here.
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Learner', 'Mode', 'Score', 'Pct', 'Passed', 'Date', 'Duration'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.sid} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem',
                          padding: '2px 7px', borderRadius: '999px', border: `1px solid ${s.mode === 'learn' ? C.tealDim : C.amberDim}`,
                          color: s.mode === 'learn' ? C.teal : C.amber,
                        }}>{s.mode}</span>
                      </td>
                      <td style={{ padding: '10px 10px', fontFamily: 'JetBrains Mono, monospace' }}>{s.score}/{s.total}</td>
                      <td style={{ padding: '10px 10px', fontFamily: 'JetBrains Mono, monospace', color: s.pct >= 70 ? C.teal : C.brick }}>{s.pct}%</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ color: s.passed ? C.teal : C.brick }}>{s.passed ? '✓' : '✗'}</span>
                      </td>
                      <td style={{ padding: '10px 10px', color: C.dim, fontSize: '0.78rem' }}>{s.date}</td>
                      <td style={{ padding: '10px 10px', color: C.dim, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>{fmtDur(s.secs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [role, setRole] = useState<Role>('learner');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('learn');
  const [timerSecs, setTimerSecs] = useState(0);
  const [examQuestions, setExamQuestions] = useState<Q[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());

  function handleLogin(n: string, r: Role) {
    setName(n);
    setRole(r);
    setScreen(r === 'trainer' ? 'trainer' : 'dashboard');
  }

  function handleLogout() {
    setScreen('login');
    setName('');
    setRole('learner');
  }

  function handleBegin(m: Mode, diff: 'all' | Diff, examTimerSecs: number) {
    setMode(m);
    setTimerSecs(examTimerSecs);
    const pool = diff === 'all' ? QUESTIONS : QUESTIONS.filter(q => q.diff === diff);
    const shuffled = shuffle(pool);
    setExamQuestions(shuffled);
    setScreen('exam');
  }

  function handleFinish(results: QResult[], secs: number) {
    const score = results.filter(r => r.pass).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const session: Session = {
      sid, name, mode, score, total, pct,
      date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      passed: pct >= PASS_PCT,
      results, secs,
    };
    saveSession(session);
    setCurrentSession(session);
    setSessions(loadSessions());
    setScreen('results');
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (screen === 'trainer') {
    return <TrainerScreen trainerName={name} sessions={sessions} onLogout={handleLogout} />;
  }

  if (screen === 'dashboard') {
    return (
      <DashboardScreen
        name={name} sessions={sessions}
        onStartSetup={() => setScreen('setup')}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'setup') {
    return (
      <SetupScreen
        name={name}
        onBegin={handleBegin}
        onBack={() => setScreen('dashboard')}
      />
    );
  }

  if (screen === 'exam') {
    return (
      <ExamScreen
        questions={examQuestions}
        mode={mode}
        timerSecs={timerSecs}
        learnerName={name}
        onFinish={handleFinish}
      />
    );
  }

  if (screen === 'results' && currentSession) {
    return (
      <ResultsScreen
        session={currentSession}
        onRestart={() => setScreen('setup')}
        onDashboard={() => setScreen('dashboard')}
      />
    );
  }

  return null;
}
