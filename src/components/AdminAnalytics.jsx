import React, { useState, useEffect, useCallback, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek, addWeeks, getISOWeek } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
const fmtH = (v) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ── Name abbreviation: "Akin Uslucan" → "A. Uslucan" ────────────────────────
function abbrevName(full) {
    if (!full) return full;
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return full;
    return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

// ── ISO week helper ──────────────────────────────────────────────────────────
function getStartOfISOWeek(week, year) {
    const jan4 = new Date(year, 0, 4);
    return addWeeks(startOfWeek(jan4, { weekStartsOn: 1 }), week - 1);
}

// ── Filter bar — UNCONTROLLED (ref-based) so React never touches the DOM value.
// This is the only reliable way to prevent focus/typing issues in a memoized component.
const FilterBar = memo(function FilterBar({ onFilter }) {
    const inputRef = React.useRef(null);
    const apply = () => onFilter(inputRef.current?.value ?? '');
    const clear = () => {
        if (inputRef.current) inputRef.current.value = '';
        onFilter('');
    };
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Exclude Orders:</span>
            <input
                ref={inputRef}
                type="text"
                defaultValue=""
                placeholder="e.g. 990005, 290002"
                onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
                style={{ width: '190px', boxSizing: 'content-box', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
            />
            <button onClick={apply} style={PILL_BTN_PRIMARY}>Apply</button>
            <button onClick={clear} style={PILL_BTN_GHOST}>✕ Clear</button>
        </div>
    );
});


// ── CW Picker (dropdown-based — no clipping issues) ───────────────────────────
const SELECT_STYLE = {
    background: 'transparent', border: 'none', outline: 'none',
    color: 'white', cursor: 'pointer', fontWeight: 700,
    width: 'auto', boxSizing: 'content-box', padding: '0 2px',
    appearance: 'none', WebkitAppearance: 'none',
};

function CWPicker({ cwNumber, cwYear, dateStart, dateEnd, onShift, onSetWeek, onSetYear }) {
    const maxWeek = getISOWeek(new Date(cwYear, 11, 28));
    const years = Array.from({ length: 10 }, (_, i) => 2022 + i);
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'stretch',
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(59,130,246,0.5)',
            borderRadius: '10px', overflow: 'hidden',
        }}>
            <button onClick={() => onShift(-1)} title="Previous week" style={ARROW_BTN}>‹</button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.35rem 0.9rem' }}>
                <span style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.14em', color: '#3b82f6', textTransform: 'uppercase', lineHeight: 1, marginBottom: '3px' }}>
                    Calendar Week
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select value={cwNumber} onChange={(e) => onSetWeek(Number(e.target.value))}
                        style={{ ...SELECT_STYLE, fontSize: '1.4rem' }}>
                        {Array.from({ length: maxWeek }, (_, i) => i + 1).map(w => (
                            <option key={w} value={w} style={{ background: '#1e293b', color: 'white' }}>
                                {String(w).padStart(2, '0')}
                            </option>
                        ))}
                    </select>
                    <span style={{ color: '#475569', fontSize: '1rem' }}>/</span>
                    <select value={cwYear} onChange={(e) => onSetYear(Number(e.target.value))}
                        style={{ ...SELECT_STYLE, fontSize: '0.9rem', color: '#94a3b8' }}>
                        {years.map(y => (
                            <option key={y} value={y} style={{ background: '#1e293b', color: 'white' }}>{y}</option>
                        ))}
                    </select>
                </div>
                {dateStart && dateEnd && (
                    <span style={{ fontSize: '0.62rem', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap' }}>
                        {dateStart} – {dateEnd}
                    </span>
                )}
            </div>

            <button onClick={() => onShift(+1)} title="Next week" style={{ ...ARROW_BTN, borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: 'none' }}>›</button>
        </div>
    );
}

// ── Style constants ──────────────────────────────────────────────────────────
const ARROW_BTN = {
    background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8', cursor: 'pointer', width: '36px', fontSize: '1.4rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const PILL_BTN_PRIMARY = { padding: '0.35rem 0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, width: 'auto' };
const PILL_BTN_GHOST = { padding: '0.35rem 0.5rem', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', width: 'auto' };
const DASHED_BTN = (color) => ({ background: 'transparent', border: `1px dashed ${color}`, borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.65rem', fontSize: '0.8rem', fontWeight: 500, color, width: 'auto' });

// ── Compliance Table ──────────────────────────────────────────────────────────
function ComplianceTable({ complianceData, weeklyData, mode, onModeChange, pmTargets, onTargetChange }) {
    const weekKeys = [...new Set(weeklyData.map(r => r.weekKey))].sort();
    const byPm = {};
    weeklyData.forEach(r => {
        if (!byPm[r.name]) byPm[r.name] = {};
        byPm[r.name][r.weekKey] = r.weekHours;
    });

    const sorted = [...complianceData].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                    <h3 className="card-title" style={{ marginBottom: '0.15rem' }}>Weekly Compliance</h3>
                    <p className="text-muted text-sm">Hours per PM vs. individual target.</p>
                </div>
                <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                    {['total', 'weekly'].map(m => (
                        <button key={m} onClick={() => onModeChange(m)} style={{
                            padding: '0.3rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, width: 'auto',
                            background: mode === m ? '#3b82f6' : 'transparent',
                            color: mode === m ? 'white' : '#94a3b8',
                            border: 'none', cursor: 'pointer',
                        }}>
                            {m === 'total' ? 'Total' : 'Per Week'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto', overflowX: 'auto' }}>
                {mode === 'total' ? (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Project Manager</th>
                                <th style={{ textAlign: 'center' }}>Target h/wk</th>
                                <th style={{ textAlign: 'right' }}>Total Hours</th>
                                <th style={{ textAlign: 'left' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(row => {
                                const target = pmTargets[row.name] ?? 40;
                                const diff = row.totalHours - target;
                                const ok = diff >= 0;
                                return (
                                    <tr key={row.name}>
                                        <td>{abbrevName(row.name)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number" min="1" max="60" value={target}
                                                onChange={(e) => onTargetChange(row.name, Number(e.target.value))}
                                                style={{
                                                    width: '48px', textAlign: 'center', boxSizing: 'content-box',
                                                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)',
                                                    borderRadius: '4px', color: 'white', fontSize: '0.85rem', padding: '0.2rem',
                                                }}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmtH(row.totalHours)} h</td>
                                        <td style={{ color: ok ? '#10b981' : '#f59e0b' }}>
                                            {ok ? `✅ +${fmtH(diff)} h` : `⚠️ −${fmtH(Math.abs(diff))} h`}
                                        </td>
                                    </tr>
                                );
                            })}
                            {!sorted.length && <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>No data</td></tr>}
                        </tbody>
                    </table>
                ) : (
                    <table style={{ minWidth: `${220 + weekKeys.length * 80}px` }}>
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', left: 0, background: '#1e293b', zIndex: 1, textAlign: 'left', minWidth: '120px' }}>PM</th>
                                <th style={{ position: 'sticky', left: '120px', background: '#1e293b', zIndex: 1, textAlign: 'center', minWidth: '60px' }}>Target</th>
                                {weekKeys.map(wk => (
                                    <th key={wk} style={{ textAlign: 'right', whiteSpace: 'nowrap', minWidth: '75px' }}>
                                        CW {(wk.split('-W')[1] || wk.split('W')[1] || '').replace(/^0/, '')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(row => {
                                const target = pmTargets[row.name] ?? 40;
                                return (
                                    <tr key={row.name}>
                                        <td style={{ position: 'sticky', left: 0, background: '#1e293b', whiteSpace: 'nowrap', minWidth: '120px' }}>{abbrevName(row.name)}</td>
                                        <td style={{ position: 'sticky', left: '120px', background: '#1e293b', textAlign: 'center', minWidth: '60px' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{target} h</span>
                                        </td>
                                        {weekKeys.map(wk => {
                                            const h = byPm[row.name]?.[wk] ?? 0;
                                            const ok = h >= target;
                                            return (
                                                <td key={wk} style={{
                                                    textAlign: 'right', minWidth: '75px',
                                                    color: h === 0 ? '#374151' : ok ? '#10b981' : '#f59e0b',
                                                    fontWeight: h > 0 ? 600 : 400,
                                                }}>
                                                    {h > 0 ? `${fmtH(h)} h` : '—'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
const TARGET_STORAGE_KEY = 'analytics_pm_targets';

export default function AdminAnalytics() {
    const [complianceData, setComplianceData] = useState([]);
    const [weeklyBreakdown, setWeeklyBreakdown] = useState([]);
    const [complianceMode, setComplianceMode] = useState('total');
    const [topOrders, setTopOrders] = useState([]);
    const [pmDistribution, setPmDistribution] = useState([]);
    const [selectedPM, setSelectedPM] = useState('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [cwNumber, setCwNumber] = useState(getISOWeek(new Date()));
    const [cwYear, setCwYear] = useState(new Date().getFullYear());
    const [excludeOrders, setExcludeOrders] = useState([]);
    const [pmTargets, setPmTargets] = useState(() => {
        try { return JSON.parse(localStorage.getItem(TARGET_STORAGE_KEY) || '{}'); } catch { return {}; }
    });

    const handleTargetChange = (name, val) => {
        const next = { ...pmTargets, [name]: val };
        setPmTargets(next);
        localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(next));
    };

    const applyWeek = useCallback((w, y) => {
        const cw = Math.max(1, Math.min(53, w));
        const cy = Math.max(2022, Math.min(2031, y));
        const start = getStartOfISOWeek(cw, cy);
        const end = endOfWeek(start, { weekStartsOn: 1 });
        setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
        setCwNumber(cw);
        setCwYear(cy);
    }, []);

    const shiftWeek = useCallback((delta) => {
        setCwNumber(prev => {
            const maxW = getISOWeek(new Date(cwYear, 11, 28));
            let w = prev + delta, y = cwYear;
            if (w < 1) { y--; w = getISOWeek(new Date(y, 11, 28)); setCwYear(y); }
            else if (w > maxW) { y++; w = 1; setCwYear(y); }
            const start = getStartOfISOWeek(w, y);
            const end = endOfWeek(start, { weekStartsOn: 1 });
            setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
            return w;
        });
    }, [cwYear]);

    useEffect(() => { applyWeek(getISOWeek(new Date()), new Date().getFullYear()); }, []);
    useEffect(() => { if (dateRange.start && dateRange.end) loadAll(); }, [dateRange, excludeOrders]);
    useEffect(() => { if (dateRange.start && dateRange.end) loadPmDistribution(); }, [selectedPM, dateRange, excludeOrders]);

    const loadAll = async () => {
        if (!window.electron) return;
        const params = { startDate: dateRange.start, endDate: dateRange.end, excludeOrders };
        const [cr, or, wr] = await Promise.all([
            window.electron.getWeeklyCompliance(params),
            window.electron.getTopOrders(params),
            window.electron.getPmWeeklyBreakdown(params),
        ]);
        if (cr.success) setComplianceData(cr.data);
        if (or.success) setTopOrders(or.data);
        if (wr.success) setWeeklyBreakdown(wr.data);
    };

    const loadPmDistribution = async () => {
        if (!window.electron) return;
        const res = await window.electron.getPmDistribution({
            projectManager: selectedPM,
            startDate: dateRange.start,
            endDate: dateRange.end,
            excludeOrders,
        });
        if (res.success) setPmDistribution(res.data);
    };

    const handleFilter = useCallback((rawStr) => {
        setExcludeOrders(rawStr.split(',').map(s => s.trim()).filter(Boolean));
    }, []);

    const sortedPMList = [...complianceData].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div style={{ padding: '1rem' }}>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ margin: '0 0 0.6rem 0', fontSize: '1.15rem', fontWeight: 700 }}>Analytics Dashboard</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={async () => {
                            if (window.electron) { const r = await window.electron.seedMockData(); alert(r.message); loadAll(); loadPmDistribution(); }
                        }} style={DASHED_BTN('rgba(148,163,184,0.8)')}>+ Seed Mock Data</button>
                        <button onClick={async () => {
                            if (window.electron && confirm('Delete all injected mock data?')) { const r = await window.electron.deleteMockData(); alert(r.message); loadAll(); loadPmDistribution(); }
                        }} style={DASHED_BTN('#ef4444')}>− Delete Mock Data</button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <CWPicker
                            cwNumber={cwNumber} cwYear={cwYear}
                            dateStart={dateRange.start} dateEnd={dateRange.end}
                            onShift={shiftWeek}
                            onSetWeek={(w) => applyWeek(w, cwYear)}
                            onSetYear={(y) => applyWeek(cwNumber, y)}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#475569' }}>or</span>
                        <input type="date" value={dateRange.start}
                            onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
                            style={{ width: '130px', boxSizing: 'content-box', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                        <span style={{ color: '#475569' }}>–</span>
                        <input type="date" value={dateRange.end}
                            onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
                            style={{ width: '130px', boxSizing: 'content-box', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                    </div>
                    <FilterBar onFilter={handleFilter} />
                </div>
            </div>

            {/* ── Charts Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                <ComplianceTable
                    complianceData={complianceData}
                    weeklyData={weeklyBreakdown}
                    mode={complianceMode}
                    onModeChange={setComplianceMode}
                    pmTargets={pmTargets}
                    onTargetChange={handleTargetChange}
                />

                <div className="card">
                    <h3 className="card-title">Top Orders</h3>
                    <p className="text-muted text-sm mb-4">Highest time consumption (company-wide).</p>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={topOrders} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
                                    formatter={(v) => [`${fmtH(v)} h`, 'Total Time']} />
                                <Bar dataKey="totalHours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h3 className="card-title">PM Time Distribution</h3>
                            <p className="text-muted text-sm">Order breakdown for selected PM (or all PMs).</p>
                        </div>
                        <select value={selectedPM} onChange={(e) => setSelectedPM(e.target.value)}
                            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.18)', width: 'auto', maxWidth: '220px' }}>
                            <option value="ALL" style={{ backgroundColor: '#1e293b' }}>— All Project Managers —</option>
                            {sortedPMList.map(r => (
                                <option key={r.name} value={r.name} style={{ backgroundColor: '#1e293b' }}>{abbrevName(r.name)}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ width: '100%', height: 420 }}>
                        {pmDistribution.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={pmDistribution} cx="50%" cy="50%"
                                        innerRadius={80} outerRadius={155} paddingAngle={4} dataKey="value"
                                        label={({ name, percent }) => percent > 0.04 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}>
                                        {pmDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
                                        formatter={(v) => [`${fmtH(v)} h`, 'Hours']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#475569' }}>No data for this selection.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
