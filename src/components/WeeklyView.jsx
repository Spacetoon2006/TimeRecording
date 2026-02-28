import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, getISOWeek, eachDayOfInterval } from 'date-fns';
import { getDayInfo } from '../data/staticData';

export default function WeeklyView({ user, refreshTrigger, forcedDate }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (forcedDate) {
            setCurrentDate(forcedDate);
        }
    }, [forcedDate]);

    const [entries, setEntries] = useState([]);
    const [weeklySum, setWeeklySum] = useState(0);

    // Calculate week range (Monday to Sunday)
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekNumber = getISOWeek(currentDate);
    const weekDays = eachDayOfInterval({ start, end });

    useEffect(() => {
        fetchEntries();
    }, [currentDate, user, refreshTrigger]);

    const fetchEntries = async () => {
        if (!window.electron) return;
        try {
            const data = await window.electron.getEntries({
                projectManager: user,
                startDate: format(start, 'yyyy-MM-dd'),
                endDate: format(end, 'yyyy-MM-dd')
            });
            setEntries(data);

            const total = data.reduce((acc, curr) => acc + curr.duration, 0);
            setWeeklySum(total);
        } catch (err) {
            console.error("Error fetching entries:", err);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this entry?')) {
            await window.electron.deleteEntry(id);
            fetchEntries();
        }
    };

    const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));

    // Helper to get entries for a specific day
    const getEntriesForDay = (dateStr) => entries.filter(e => e.date === dateStr);

    // Calculate daily sums
    const getDailySum = (dateStr) => {
        return getEntriesForDay(dateStr).reduce((acc, e) => acc + e.duration, 0);
    };

    return (
        <div className="card">
            <div className="header-card" style={{ marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ marginBottom: 0 }}>
                    Calendar Week {weekNumber} <span className="text-muted text-sm">({format(start, 'dd.MM')} - {format(end, 'dd.MM.yyyy')})</span>
                </h3>
                <div className="flex-row">
                    <button onClick={handlePrevWeek} className="btn btn-text">← Prev</button>
                    <button onClick={() => setCurrentDate(new Date())} className="btn btn-text">Today</button>
                    <button onClick={handleNextWeek} className="btn btn-text">Next →</button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', paddingRight: '0.5rem', minHeight: '400px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1e293b', zIndex: 10, boxShadow: '0 2px 4px -2px rgba(0,0,0,0.5)' }}>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem' }}>Date</th>
                            <th style={{ padding: '0.75rem' }}>Day</th>
                            <th style={{ padding: '0.75rem' }}>Type</th>
                            <th style={{ padding: '0.75rem' }}>Order Nr.</th>
                            <th style={{ padding: '0.75rem' }}>Time (h)</th>
                            <th style={{ padding: '0.75rem' }}>Comment</th>
                            <th style={{ padding: '0.75rem' }}>Daily Sum</th>
                            <th style={{ padding: '0.75rem' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayEntries = getEntriesForDay(dateStr);
                            const dayInfo = getDayInfo(dateStr);
                            const dailySum = getDailySum(dateStr);

                            // If no entries, show one empty row or just the day row? 
                            // Excel shows rows for days even if empty.
                            // We will render the day info on the first row of that day.

                            if (dayEntries.length === 0) {
                                return (
                                    <tr key={dateStr} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem' }}>{format(day, 'dd.MM.yy')}</td>
                                        <td style={{ padding: '0.75rem' }}>{format(day, 'EEE')}</td>
                                        <td style={{ padding: '0.75rem', color: dayInfo.type === 'Werktag' ? 'var(--text-color)' : 'var(--danger)' }}>
                                            {dayInfo.type}
                                        </td>
                                        <td colSpan={3} style={{ padding: '0.75rem', opacity: 0.5 }}>-</td>
                                        <td style={{ padding: '0.75rem' }}>-</td>
                                        <td></td>
                                    </tr>
                                );
                            }

                            return dayEntries.map((entry, index) => (
                                <tr key={entry.id} style={{ borderBottom: index === dayEntries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    {/* Date/Day columns only on first row of the day */}
                                    <td style={{ padding: '0.75rem' }}>{index === 0 ? format(day, 'dd.MM.yy') : ''}</td>
                                    <td style={{ padding: '0.75rem' }}>{index === 0 ? format(day, 'EEE') : ''}</td>
                                    <td style={{ padding: '0.75rem' }}>{index === 0 ? dayInfo.type : ''}</td>

                                    <td style={{ padding: '0.75rem' }}>{entry.order_nr}</td>
                                    <td style={{ padding: '0.75rem' }}>{entry.duration.toLocaleString('de-DE')}</td>
                                    <td style={{ padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {entry.comment}
                                    </td>

                                    {/* Daily Sum only on first row, or maybe last? Let's do first for visibility */}
                                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                                        {index === 0 && dailySum > 0 ? dailySum.toLocaleString('de-DE') : ''}
                                    </td>

                                    <td style={{ padding: '0.75rem' }}>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            ));
                        })}

                        {/* Weekly Sum Footer */}
                        <tr style={{ borderTop: '2px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <td colSpan={6} style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                Weekly Sum:
                            </td>
                            <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)' }}>
                                {weeklySum.toLocaleString('de-DE')} h
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
