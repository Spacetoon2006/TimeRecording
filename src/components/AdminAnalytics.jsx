import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    ComposedChart, Line, LineChart,
} from 'recharts';
import { format, startOfWeek, endOfWeek, addWeeks, getISOWeek } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
const fmtH = (v) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtEur = (v) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

function abbrevName(full) {
    if (!full) return full;
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) return full;
    return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

function getStartOfISOWeek(week, year) {
    const jan4 = new Date(year, 0, 4);
    return addWeeks(startOfWeek(jan4, { weekStartsOn: 1 }), week - 1);
}

// ── Storage keys ─────────────────────────────────────────────────────────────
const TARGET_KEY = 'analytics_pm_targets';
const RATE_KEY = 'analytics_pm_rates';

// ── Uncontrolled filter bar ───────────────────────────────────────────────────
const FilterBar = memo(function FilterBar({ onFilter }) {
    const ref = React.useRef(null);
    const apply = () => onFilter(ref.current?.value ?? '');
    const clear = () => { if (ref.current) ref.current.value = ''; onFilter(''); };
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Exclude Orders:</span>
            <input ref={ref} type="text" defaultValue="" placeholder="e.g. 990005, 290002"
                onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
                style={{ width: '190px', boxSizing: 'content-box', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
            <button onClick={apply} style={BTN_PRI}>Apply</button>
            <button onClick={clear} style={BTN_GHOST}>✕ Clear</button>
        </div>
    );
});

// ── CW Picker ────────────────────────────────────────────────────────────────
const SEL = { background: 'transparent', border: 'none', outline: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, width: 'auto', boxSizing: 'content-box', padding: '0 2px', appearance: 'none', WebkitAppearance: 'none' };

function CWPicker({ cwNumber, cwYear, dateStart, dateEnd, onShift, onSetWeek, onSetYear }) {
    const maxWeek = getISOWeek(new Date(cwYear, 11, 28));
    const years = Array.from({ length: 10 }, (_, i) => 2022 + i);
    return (
        <div style={{ display: 'inline-flex', alignItems: 'stretch', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '10px', overflow: 'hidden' }}>
            <button onClick={() => onShift(-1)} style={ARROW_BTN}>‹</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.35rem 0.9rem' }}>
                <span style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.14em', color: '#3b82f6', textTransform: 'uppercase', lineHeight: 1, marginBottom: '3px' }}>Calendar Week</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select value={cwNumber} onChange={(e) => onSetWeek(Number(e.target.value))} style={{ ...SEL, fontSize: '1.4rem' }}>
                        {Array.from({ length: maxWeek }, (_, i) => i + 1).map(w => (
                            <option key={w} value={w} style={{ background: '#1e293b', color: 'white' }}>{String(w).padStart(2, '0')}</option>
                        ))}
                    </select>
                    <span style={{ color: '#475569', fontSize: '1rem' }}>/</span>
                    <select value={cwYear} onChange={(e) => onSetYear(Number(e.target.value))} style={{ ...SEL, fontSize: '0.9rem', color: '#94a3b8' }}>
                        {years.map(y => <option key={y} value={y} style={{ background: '#1e293b', color: 'white' }}>{y}</option>)}
                    </select>
                </div>
                {dateStart && dateEnd && (
                    <span style={{ fontSize: '0.62rem', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap' }}>{dateStart} – {dateEnd}</span>
                )}
            </div>
            <button onClick={() => onShift(+1)} style={{ ...ARROW_BTN, borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: 'none' }}>›</button>
        </div>
    );
}

// ── Style constants ───────────────────────────────────────────────────────────
const ARROW_BTN = { background: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', width: '36px', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const BTN_PRI = { padding: '0.35rem 0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, width: 'auto' };
const BTN_GHOST = { padding: '0.35rem 0.5rem', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', width: 'auto' };
const DASHED_BTN = (c) => ({ background: 'transparent', border: `1px dashed ${c}`, borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.65rem', fontSize: '0.8rem', fontWeight: 500, color: c, width: 'auto' });
const NUM_INPUT = { width: '52px', textAlign: 'center', boxSizing: 'content-box', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'white', fontSize: '0.82rem', padding: '0.2rem' };
const CARD = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' };
const CARD_TITLE = { margin: '0 0 0.15rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' };
const MUTED = { fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem 0' };

// ── Compliance table ──────────────────────────────────────────────────────────
function ComplianceTable({ complianceData, weeklyData, mode, onModeChange, pmTargets, onTargetChange }) {
    const weekKeys = [...new Set(weeklyData.map(r => r.weekKey))].sort();
    const byPm = {};
    weeklyData.forEach(r => { if (!byPm[r.name]) byPm[r.name] = {}; byPm[r.name][r.weekKey] = r.weekHours; });
    const sorted = [...complianceData].sort((a, b) => a.name.localeCompare(b.name));
    return (
        <div style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div><h3 style={CARD_TITLE}>Weekly Compliance</h3><p style={MUTED}>Hours per PM vs. individual target.</p></div>
                <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                    {['total', 'weekly'].map(m => (
                        <button key={m} onClick={() => onModeChange(m)} style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, width: 'auto', background: mode === m ? '#3b82f6' : 'transparent', color: mode === m ? 'white' : '#94a3b8', border: 'none', cursor: 'pointer' }}>
                            {m === 'total' ? 'Total' : 'Per Week'}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ maxHeight: '340px', overflowY: 'auto', overflowX: 'auto' }}>
                {mode === 'total' ? (
                    <table><thead><tr><th style={{ textAlign: 'left' }}>Project Manager</th><th style={{ textAlign: 'center' }}>Target h/wk</th><th style={{ textAlign: 'right' }}>Total Hours</th><th style={{ textAlign: 'left' }}>Status</th></tr></thead>
                        <tbody>{sorted.map(row => {
                            const target = pmTargets[row.name] ?? 40;
                            const diff = row.totalHours - target;
                            const ok = diff >= 0;
                            return (<tr key={row.name}>
                                <td>{abbrevName(row.name)}</td>
                                <td style={{ textAlign: 'center' }}><input type="number" min="1" max="60" value={target} onChange={(e) => onTargetChange(row.name, Number(e.target.value))} style={NUM_INPUT} /></td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmtH(row.totalHours)} h</td>
                                <td style={{ color: ok ? '#10b981' : '#f59e0b' }}>{ok ? `✅ +${fmtH(diff)} h` : `⚠️ −${fmtH(Math.abs(diff))} h`}</td>
                            </tr>);
                        })}{!sorted.length && <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>No data</td></tr>}</tbody>
                    </table>
                ) : (
                    <table style={{ minWidth: `${220 + weekKeys.length * 80}px` }}>
                        <thead><tr>
                            <th style={{ position: 'sticky', left: 0, background: '#1e293b', zIndex: 1, textAlign: 'left', minWidth: '120px' }}>PM</th>
                            <th style={{ position: 'sticky', left: '120px', background: '#1e293b', zIndex: 1, textAlign: 'center', minWidth: '60px' }}>Target</th>
                            {weekKeys.map(wk => <th key={wk} style={{ textAlign: 'right', whiteSpace: 'nowrap', minWidth: '75px' }}>CW {(wk.split('-W')[1] || wk.split('W')[1] || '').replace(/^0/, '')}</th>)}
                        </tr></thead>
                        <tbody>{sorted.map(row => {
                            const target = pmTargets[row.name] ?? 40;
                            return (<tr key={row.name}>
                                <td style={{ position: 'sticky', left: 0, background: '#1e293b', whiteSpace: 'nowrap' }}>{abbrevName(row.name)}</td>
                                <td style={{ position: 'sticky', left: '120px', background: '#1e293b', textAlign: 'center' }}><span style={{ fontSize: '0.8rem', color: '#64748b' }}>{target} h</span></td>
                                {weekKeys.map(wk => {
                                    const h = byPm[row.name]?.[wk] ?? 0;
                                    return (<td key={wk} style={{ textAlign: 'right', color: h === 0 ? '#374151' : h >= target ? '#10b981' : '#f59e0b', fontWeight: h > 0 ? 600 : 400 }}>{h > 0 ? `${fmtH(h)} h` : '—'}</td>);
                                })}
                            </tr>);
                        })}</tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
    // Core state
    const [complianceData, setComplianceData] = useState([]);
    const [weeklyBreakdown, setWeeklyBreakdown] = useState([]);
    const [complianceMode, setComplianceMode] = useState('total');
    const [topOrders, setTopOrders] = useState([]);
    const [pmDistribution, setPmDistribution] = useState([]);
    const [selectedPM, setSelectedPM] = useState('ALL');

    // New metric state
    const [billableRatio, setBillableRatio] = useState([]);
    const [labourCost, setLabourCost] = useState([]);
    const [paretoData, setParetoData] = useState([]);
    const [overtimeData, setOvertimeData] = useState([]);
    const [wowTrend, setWowTrend] = useState([]);
    const [orderPmBreakdown, setOrderPmBreakdown] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState('');

    // Date / filter state
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [cwNumber, setCwNumber] = useState(getISOWeek(new Date()));
    const [cwYear, setCwYear] = useState(new Date().getFullYear());
    const [excludeOrders, setExcludeOrders] = useState([]);

    // Persisted PM settings
    const [pmTargets, setPmTargets] = useState(() => { try { return JSON.parse(localStorage.getItem(TARGET_KEY) || '{}'); } catch { return {}; } });
    const [pmRates, setPmRates] = useState(() => { try { return JSON.parse(localStorage.getItem(RATE_KEY) || '{}'); } catch { return {}; } });

    const handleTargetChange = (name, val) => { const n = { ...pmTargets, [name]: val }; setPmTargets(n); localStorage.setItem(TARGET_KEY, JSON.stringify(n)); };
    const handleRateChange = (name, val) => { const n = { ...pmRates, [name]: val }; setPmRates(n); localStorage.setItem(RATE_KEY, JSON.stringify(n)); };

    // Week navigation
    const applyWeek = useCallback((w, y) => {
        const cw = Math.max(1, Math.min(53, w)), cy = Math.max(2022, Math.min(2031, y));
        const start = getStartOfISOWeek(cw, cy), end = endOfWeek(start, { weekStartsOn: 1 });
        setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
        setCwNumber(cw); setCwYear(cy);
    }, []);

    const shiftWeek = useCallback((delta) => {
        setCwNumber(prev => {
            const maxW = getISOWeek(new Date(cwYear, 11, 28));
            let w = prev + delta, y = cwYear;
            if (w < 1) { y--; w = getISOWeek(new Date(y, 11, 28)); setCwYear(y); }
            else if (w > maxW) { y++; w = 1; setCwYear(y); }
            const start = getStartOfISOWeek(w, y), end = endOfWeek(start, { weekStartsOn: 1 });
            setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
            return w;
        });
    }, [cwYear]);

    useEffect(() => { applyWeek(getISOWeek(new Date()), new Date().getFullYear()); }, []);
    useEffect(() => { if (dateRange.start && dateRange.end) loadAll(); }, [dateRange, excludeOrders]);
    useEffect(() => { if (dateRange.start && dateRange.end) loadPmDistribution(); }, [selectedPM, dateRange, excludeOrders]);
    useEffect(() => { if (selectedOrder && dateRange.start) loadOrderBreakdown(); }, [selectedOrder, dateRange]);

    const loadAll = async () => {
        if (!window.electron) return;
        const p = { startDate: dateRange.start, endDate: dateRange.end, excludeOrders };
        const [cr, or, wr, br, lc, par, ov, wow] = await Promise.all([
            window.electron.getWeeklyCompliance(p),
            window.electron.getTopOrders(p),
            window.electron.getPmWeeklyBreakdown(p),
            window.electron.getBillableRatio(p),
            window.electron.getLabourCost(p),
            window.electron.getParetoOrders(p),
            window.electron.getOvertime(p),
            window.electron.getWowTrend({ endDate: dateRange.end }),
        ]);
        if (cr.success) setComplianceData(cr.data);
        if (or.success) setTopOrders(or.data);
        if (wr.success) setWeeklyBreakdown(wr.data);
        if (br.success) setBillableRatio(br.data);
        if (lc.success) setLabourCost(lc.data);
        if (par.success) setParetoData(par.data);
        if (ov.success) setOvertimeData(ov.data);
        if (wow.success) setWowTrend(wow.data);
    };

    const loadPmDistribution = async () => {
        if (!window.electron) return;
        const res = await window.electron.getPmDistribution({ projectManager: selectedPM, startDate: dateRange.start, endDate: dateRange.end, excludeOrders });
        if (res.success) setPmDistribution(res.data);
    };

    const loadOrderBreakdown = async () => {
        if (!window.electron || !selectedOrder) return;
        const res = await window.electron.getOrderPmBreakdown({ orderNr: selectedOrder, startDate: dateRange.start, endDate: dateRange.end });
        if (res.success) setOrderPmBreakdown(res.data);
    };

    const handleFilter = useCallback((raw) => {
        setExcludeOrders(raw.split(',').map(s => s.trim()).filter(Boolean));
    }, []);

    // Derived data for Labour Cost panel
    const labourCostByOrder = React.useMemo(() => {
        const map = {};
        labourCost.forEach(r => {
            if (!map[r.name]) map[r.name] = { name: r.name, cost: 0 };
            const rate = pmRates[r.project_manager] ?? 50;
            map[r.name].cost += r.hours * rate;
        });
        return Object.values(map).sort((a, b) => b.cost - a.cost).slice(0, 10);
    }, [labourCost, pmRates]);

    const sortedPM = [...complianceData].sort((a, b) => a.name.localeCompare(b.name));
    const allOrders = [...new Set(topOrders.map(o => o.name))];

    return (
        <div style={{ padding: '1rem' }}>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ margin: '0 0 0.6rem 0', fontSize: '1.15rem', fontWeight: 700 }}>Analytics Dashboard</h2>
                    {import.meta.env.DEV && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button onClick={async () => { if (window.electron) { const r = await window.electron.seedMockData(); alert(r.message); loadAll(); loadPmDistribution(); } }} style={DASHED_BTN('rgba(148,163,184,0.8)')}>+ Seed Mock Data</button>
                            <button onClick={async () => { if (window.electron && confirm('Delete all mock data?')) { const r = await window.electron.deleteMockData(); alert(r.message); loadAll(); loadPmDistribution(); } }} style={DASHED_BTN('#ef4444')}>− Delete Mock Data</button>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <CWPicker cwNumber={cwNumber} cwYear={cwYear} dateStart={dateRange.start} dateEnd={dateRange.end} onShift={shiftWeek} onSetWeek={(w) => applyWeek(w, cwYear)} onSetYear={(y) => applyWeek(cwNumber, y)} />
                        <span style={{ fontSize: '0.75rem', color: '#475569' }}>or</span>
                        <input type="date" value={dateRange.start} onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))} style={{ width: '130px', boxSizing: 'content-box', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                        <span style={{ color: '#475569' }}>–</span>
                        <input type="date" value={dateRange.end} onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))} style={{ width: '130px', boxSizing: 'content-box', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                    </div>
                    <FilterBar onFilter={handleFilter} />
                </div>
            </div>

            {/* ── Row 1: Compliance + Top Orders ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <ComplianceTable complianceData={complianceData} weeklyData={weeklyBreakdown} mode={complianceMode} onModeChange={setComplianceMode} pmTargets={pmTargets} onTargetChange={handleTargetChange} />

                <div style={CARD}>
                    <h3 style={CARD_TITLE}>Top Orders</h3>
                    <p style={MUTED}>Highest time consumption.</p>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <BarChart data={topOrders} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} formatter={(v) => [`${fmtH(v)} h`, 'Hours']} />
                                <Bar dataKey="totalHours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Billable Ratio + Overtime ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Billable vs Non-Billable */}
                <div style={CARD}>
                    <h3 style={CARD_TITLE}>Billable vs. Non-Billable</h3>
                    <p style={MUTED}>Productive hours vs. absence per PM.</p>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <BarChart data={billableRatio.map(r => ({ ...r, name: abbrevName(r.name) }))} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} formatter={(v, n) => [`${fmtH(v)} h`, n === 'billable' ? 'Billable' : 'Absent']} />
                                <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                                <Bar dataKey="billable" name="Billable" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="absent" name="Absent" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Weekend / Overtime */}
                <div style={CARD}>
                    <h3 style={CARD_TITLE}>Weekend / Overtime</h3>
                    <p style={MUTED}>Hours logged on Saturday & Sunday per PM.</p>
                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        <table>
                            <thead><tr>
                                <th style={{ textAlign: 'left' }}>Project Manager</th>
                                <th style={{ textAlign: 'right' }}>Weekend h</th>
                                <th style={{ textAlign: 'right' }}>Total h</th>
                                <th style={{ textAlign: 'right' }}>W/E %</th>
                            </tr></thead>
                            <tbody>
                                {overtimeData.filter(r => r.weekendHours > 0).map(r => {
                                    const pct = r.totalHours > 0 ? (r.weekendHours / r.totalHours * 100).toFixed(0) : 0;
                                    const hot = pct > 20;
                                    return (<tr key={r.name}>
                                        <td>{abbrevName(r.name)}</td>
                                        <td style={{ textAlign: 'right', color: hot ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{fmtH(r.weekendHours)} h</td>
                                        <td style={{ textAlign: 'right' }}>{fmtH(r.totalHours)} h</td>
                                        <td style={{ textAlign: 'right' }}><span style={{ background: hot ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: hot ? '#ef4444' : '#f59e0b', borderRadius: '20px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>{pct}%</span></td>
                                    </tr>);
                                })}
                                {!overtimeData.some(r => r.weekendHours > 0) && <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>✅ No weekend hours logged</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Row 3: Pareto + Week-over-Week ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Pareto */}
                <div style={CARD}>
                    <h3 style={CARD_TITLE}>Pareto Analysis (80/20)</h3>
                    <p style={MUTED}>Top orders + cumulative % of total hours.</p>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <ComposedChart data={paretoData} margin={{ top: 5, right: 40, left: 10, bottom: 60 }}>
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }}
                                    formatter={(v, n) => n === 'hours' ? [`${fmtH(v)} h`, 'Hours'] : [`${v}%`, 'Cumulative']} />
                                <Bar yAxisId="left" dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Week-over-Week Trend */}
                <div style={CARD}>
                    <h3 style={CARD_TITLE}>Week-over-Week Trend</h3>
                    <p style={MUTED}>Total billable hours — last 8 weeks (company-wide).</p>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={wowTrend.map(r => ({ ...r, weekKey: r.weekKey.replace(/\d{4}-/, '') }))} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <XAxis dataKey="weekKey" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} formatter={(v) => [`${fmtH(v)} h`, 'Total Hours']} />
                                <Line type="monotone" dataKey="totalHours" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Row 4: Labour Cost + Cross-PM Collaboration ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Labour Cost */}
                <div style={CARD}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div><h3 style={CARD_TITLE}>Labour Cost per Order</h3><p style={MUTED}>Based on hourly rates below (edit to adjust).</p></div>
                    </div>
                    {/* Hourly rate inputs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        {sortedPM.map(r => (
                            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0.25rem 0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{abbrevName(r.name)}</span>
                                <input type="number" min="1" max="500" value={pmRates[r.name] ?? 50} onChange={(e) => handleRateChange(r.name, Number(e.target.value))} style={{ ...NUM_INPUT, width: '42px' }} />
                                <span style={{ fontSize: '0.7rem', color: '#475569' }}>€/h</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ width: '100%', height: 240 }}>
                        <ResponsiveContainer>
                            <BarChart data={labourCostByOrder} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k €`} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} formatter={(v) => [fmtEur(v), 'Labour Cost']} />
                                <Bar dataKey="cost" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cross-PM Collaboration */}
                <div style={CARD}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div><h3 style={CARD_TITLE}>Cross-PM Collaboration</h3><p style={MUTED}>Hours per PM on a single order.</p></div>
                        <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)}
                            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.18)', width: 'auto', maxWidth: '160px', fontSize: '0.82rem' }}>
                            <option value="" style={{ backgroundColor: '#1e293b' }}>— Select order —</option>
                            {allOrders.map(o => <option key={o} value={o} style={{ backgroundColor: '#1e293b' }}>{o}</option>)}
                        </select>
                    </div>
                    {orderPmBreakdown.length > 0 ? (
                        <>
                            <div style={{ width: '100%', height: 260 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={orderPmBreakdown.map(r => ({ ...r, name: abbrevName(r.name) }))} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value"
                                            label={({ name, percent }) => percent > 0.06 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}>
                                            {orderPmBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} formatter={(v) => [`${fmtH(v)} h`, 'Hours']} />
                                        <Legend formatter={(v) => abbrevName(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                                {orderPmBreakdown.map((r, i) => (
                                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                                        <span style={{ color: '#94a3b8' }}>{abbrevName(r.name)}</span>
                                        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{fmtH(r.value)} h</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px', color: '#475569', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontSize: '2rem' }}>🔍</span>
                            <span>{selectedOrder ? 'No data for this order in range' : 'Select an order to see PM breakdown'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Row 5: PM Distribution (full width) ── */}
            <div style={{ ...CARD }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div><h3 style={CARD_TITLE}>PM Time Distribution</h3><p style={MUTED}>Order breakdown for selected PM (or all PMs).</p></div>
                    <select value={selectedPM} onChange={(e) => setSelectedPM(e.target.value)}
                        style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.18)', width: 'auto', maxWidth: '220px' }}>
                        <option value="ALL" style={{ backgroundColor: '#1e293b' }}>— All Project Managers —</option>
                        {sortedPM.map(r => <option key={r.name} value={r.name} style={{ backgroundColor: '#1e293b' }}>{abbrevName(r.name)}</option>)}
                    </select>
                </div>
                <div style={{ width: '100%', height: 380 }}>
                    {pmDistribution.length > 0 ? (
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pmDistribution} cx="50%" cy="50%" innerRadius={80} outerRadius={150} paddingAngle={4} dataKey="value"
                                    label={({ name, percent }) => percent > 0.04 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}>
                                    {pmDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} formatter={(v) => [`${fmtH(v)} h`, 'Hours']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#475569' }}>No data for this selection.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
