import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    ReferenceLine, LabelList
} from 'recharts';
import { startOfWeek, endOfWeek, format, subWeeks, eachDayOfInterval, isSameDay, startOfYear } from 'date-fns';

const CARD_STYLE = {
    background: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};

const KPI_CARD = (title, value, sub, color) => (
    <div style={CARD_STYLE}>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: color || '#f8fafc', marginBottom: '0.2rem' }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color || '#64748b' }}></span>
            {sub}
        </div>
    </div>
);

export default function PersonalStats({ user, refreshTrigger }) {
    // Dynamic targets based on PM
    const targets = useMemo(() => {
        const is8hPM = user.includes('Juri') || user.includes('Aleksandar') || user.includes('Peter');
        return {
            daily: is8hPM ? 8 : 7,
            weekly: is8hPM ? 40 : 35
        };
    }, [user]);

    const [weekData, setWeekData] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [overallAdherence, setOverallAdherence] = useState(0);
    const [loading, setLoading] = useState(true);

    // For specific week view
    const [selectedWeekKey, setSelectedWeekKey] = useState(null);
    const [selectedWeekData, setSelectedWeekData] = useState(null);

    const loadData = async () => {
        if (!window.electron) return;
        setLoading(true);
        try {
            const today = new Date();
            const startOfCurrWeek = startOfWeek(today, { weekStartsOn: 1 });
            const endOfCurrWeek = endOfWeek(today, { weekStartsOn: 1 });

            // 1. Current Week Daily Distribution
            const entries = await window.electron.getEntries({
                projectManager: user,
                startDate: format(startOfCurrWeek, 'yyyy-MM-dd'),
                endDate: format(endOfCurrWeek, 'yyyy-MM-dd')
            });

            const days = eachDayOfInterval({ start: startOfCurrWeek, end: endOfCurrWeek });
            const currWeekMap = days.map(d => {
                const dayStr = format(d, 'yyyy-MM-dd');
                const dayEntries = entries.filter(e => e.date === dayStr);
                const total = dayEntries.reduce((sum, e) => sum + e.duration, 0);
                return {
                    day: format(d, 'EEEE'),
                    hours: total,
                    date: dayStr,
                    isToday: isSameDay(d, today)
                };
            });
            setWeekData(currWeekMap);

            // 2. Multi-Week Breakdowns (last 8 weeks for better context)
            const startHist = format(subWeeks(startOfCurrWeek, 8), 'yyyy-MM-dd');
            const endHist = format(today, 'yyyy-MM-dd');

            const breakDown = await window.electron.getPmWeeklyBreakdown({
                startDate: startHist,
                endDate: endHist,
                excludeOrders: []
            });

            const myHistory = (breakDown.data || [])
                .filter(r => r.name === user)
                .map(r => ({
                    weekKey: r.weekKey,
                    week: r.weekKey.split('-W')[1] ? `Week ${r.weekKey.split('-W')[1]}` : r.weekKey,
                    hours: parseFloat(r.weekHours.toFixed(1)),
                    target: targets.weekly
                }));

            setHistoryData(myHistory);

            // 3. Overall Year Adherence
            const ytdStart = format(startOfYear(today), 'yyyy-MM-dd');
            const ytdBreakdown = await window.electron.getPmWeeklyBreakdown({
                startDate: ytdStart,
                endDate: format(today, 'yyyy-MM-dd'),
                excludeOrders: []
            });

            const myYtdWeeks = (ytdBreakdown.data || []).filter(r => r.name === user);
            if (myYtdWeeks.length > 0) {
                const totalHours = myYtdWeeks.reduce((sum, w) => sum + w.weekHours, 0);
                const totalTarget = myYtdWeeks.length * targets.weekly;
                setOverallAdherence(((totalHours / totalTarget) * 100).toFixed(0));
            }

        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [user, refreshTrigger]);

    // Fetch specific week data when selected
    useEffect(() => {
        const fetchSelectedWeek = async () => {
            if (!selectedWeekKey || !window.electron) return;
            try {
                // Parse week key (e.g., 2024-W08) to get date range
                // A bit complex with date-fns, but let's find the matching record from history or breakdown
                const match = historyData.find(h => h.weekKey === selectedWeekKey);
                if (match) {
                    setSelectedWeekData(match);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchSelectedWeek();
    }, [selectedWeekKey, historyData]);

    const totalCurrWeekHours = weekData.reduce((s, d) => s + d.hours, 0);
    const avgDaily = weekData.filter(d => d.hours > 0).length > 0
        ? (totalCurrWeekHours / weekData.filter(d => d.hours > 0).length).toFixed(1)
        : 0;

    const currWeekAdherence = ((totalCurrWeekHours / targets.weekly) * 100).toFixed(0);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}>
                    <div style={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>{label}</div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                        {payload[0].value} <span style={{ fontSize: '11px', color: '#64748b' }}>hours logged</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) return (
        <div style={{ color: '#64748b', padding: '4rem', textAlign: 'center' }}>
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '1rem' }}>Generating overview...</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '0.5rem' }}>

            {/* KPI Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                {KPI_CARD("Curr. Week", `${totalCurrWeekHours}h`, `${totalCurrWeekHours >= targets.weekly ? 'Target met' : (targets.weekly - totalCurrWeekHours).toFixed(1) + 'h left'}`, totalCurrWeekHours >= targets.weekly ? '#10b981' : '#f59e0b')}
                {KPI_CARD("Daily Avg", `${avgDaily}h`, "Recording rate", "#3b82f6")}
                {KPI_CARD("Weekly Adh.", `${currWeekAdherence}%`, `Target: ${targets.weekly}h`, currWeekAdherence >= 100 ? '#10b981' : '#64748b')}
                {KPI_CARD("Overall Adh.", `${overallAdherence}%`, "Year-to-Date average", overallAdherence >= 95 ? '#10b981' : overallAdherence >= 80 ? '#3b82f6' : '#f59e0b')}
            </div>

            {/* Historical Selector & Specific Week Detail */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ ...CARD_STYLE, flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Quick Week Selection</h4>
                        <button
                            onClick={() => setSelectedWeekKey(null)}
                            className="btn btn-text"
                            style={{ fontSize: '10px', opacity: 0.6 }}
                        >
                            Reset
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {historyData.slice().reverse().map(h => (
                            <button
                                key={h.weekKey}
                                onClick={() => setSelectedWeekKey(h.weekKey)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    background: selectedWeekKey === h.weekKey ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                                    border: selectedWeekKey === h.weekKey ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                    color: selectedWeekKey === h.weekKey ? '#818cf8' : '#cbd5e1',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textAlign: 'left'
                                }}
                            >
                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{h.week}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '12px', opacity: 0.8 }}>{h.hours}h</span>
                                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min((h.hours / h.target) * 100, 100)}%`, height: '100%', background: h.hours >= h.target ? '#10b981' : '#f59e0b' }}></div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {selectedWeekData ? (
                    <div style={{ ...CARD_STYLE, flex: '2 1 600px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                                    {selectedWeekData.week} Details
                                </h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Deep dive into your recording metrics for this period.</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: selectedWeekData.hours >= selectedWeekData.target ? '#10b981' : '#f59e0b' }}>
                                    {((selectedWeekData.hours / selectedWeekData.target) * 100).toFixed(0)}%
                                </div>
                                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8' }}>Adherence</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Hours Logged vs Target</div>
                                    <div style={{ display: 'flex', alignItems: 'end', gap: '12px' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>{selectedWeekData.hours}</span>
                                        <span style={{ fontSize: '1.25rem', color: '#475569', marginBottom: '4px' }}>/ {selectedWeekData.target}h</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min((selectedWeekData.hours / selectedWeekData.target) * 100, 100)}%`, height: '100%', background: selectedWeekData.hours >= selectedWeekData.target ? '#10b981' : '#f59e0b' }}></div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                    {selectedWeekData.hours >= selectedWeekData.target
                                        ? "Benchmark target reached for this period."
                                        : `You were ${(selectedWeekData.target - selectedWeekData.hours).toFixed(1)}h under the benchmark for this period.`
                                    }
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Summary Insights</h5>
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <li>Record status: <span style={{ color: '#f8fafc' }}>Complete</span></li>
                                    <li>Deviation: <span style={{ color: selectedWeekData.hours >= selectedWeekData.target ? '#10b981' : '#f43f5e' }}>{(selectedWeekData.hours - selectedWeekData.target).toFixed(1)}h</span></li>
                                    <li>Recording status: <span style={{ color: '#3b82f6' }}>{selectedWeekData.hours > 0 ? "Active" : "None"}</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ ...CARD_STYLE, flex: '2 1 600px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                        <h4 style={{ margin: 0 }}>Select a week to see detailed adherence</h4>
                        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Click on any week on the left to start a deep dive.</p>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>

                {/* 1. Daily Activity Distribution (Always visible, Current Week) */}
                <div style={CARD_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Current Week Distribution</h4>
                    </div>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weekData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0.4} />
                                    </linearGradient>
                                    <linearGradient id="activeBarGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.5} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" horizontal={true} vertical={false} />
                                <XAxis type="number" hide domain={[0, 'dataMax + 2']} />
                                <YAxis
                                    dataKey="day"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                    width={80}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={28}>
                                    {weekData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.isToday ? 'url(#activeBarGradient)' : 'url(#barGradient)'}
                                            stroke={entry.isToday ? '#10b981' : 'none'}
                                            strokeWidth={entry.isToday ? 1 : 0}
                                        />
                                    ))}
                                    <LabelList dataKey="hours" position="right" style={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }} formatter={v => v > 0 ? `${v}h` : ''} />
                                </Bar>
                                <ReferenceLine x={targets.daily} stroke="#f43f5e" strokeDasharray="5 5" strokeWidth={1} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Historic Weekly Adherence (Context) */}
                <div style={CARD_STYLE}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Weekly Performance Trends</h4>
                    </div>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                <defs>
                                    <linearGradient id="historyGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.3} />
                                    </linearGradient>
                                    <linearGradient id="successGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#059669" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" horizontal={true} vertical={false} />
                                <XAxis type="number" hide domain={[0, 50]} />
                                <YAxis
                                    dataKey="week"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                    width={80}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={28}>
                                    {historyData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.hours >= targets.weekly ? 'url(#successGradient)' : 'url(#historyGradient)'}
                                            onClick={() => setSelectedWeekKey(entry.weekKey)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                    <LabelList dataKey="hours" position="right" style={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }} formatter={v => `${v}h`} />
                                </Bar>
                                <ReferenceLine x={targets.weekly} stroke="#f59e0b" strokeDasharray="5 5" strokeWidth={1} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
