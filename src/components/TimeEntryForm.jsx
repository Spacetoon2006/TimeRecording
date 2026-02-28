import React, { useState, useEffect } from 'react';
import { getDayInfo, DEFAULT_ORDER_NR, ABSENT_ORDER_NR } from '../data/staticData';
import { format, addDays, isBefore, isEqual, parseISO } from 'date-fns';
import OrderSelect from './OrderSelect';

export default function TimeEntryForm({ user, onEntryAdded, onDateSelect }) {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(''); // New state for date ranges
    const [orderNr, setOrderNr] = useState(DEFAULT_ORDER_NR);
    const [recentOrders, setRecentOrders] = useState([]); // Store user's specific order history
    const [duration, setDuration] = useState(8.0);
    const [comment, setComment] = useState('');

    const [dayInfo, setDayInfo] = useState({ type: 'Werktag', name: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch recent orders for this user on mount (Smart Input)
    useEffect(() => {
        if (window.electron && user) {
            window.electron.getUserOrders({ projectManager: user })
                .then(orders => setRecentOrders(orders))
                .catch(err => console.error("Failed to fetch orders", err));
        }
    }, [user]);

    useEffect(() => {
        const info = getDayInfo(date);
        setDayInfo(info);

        // Clear error if day is valid now
        if (info.type === 'Werktag' && error.includes('Holiday')) {
            setError('');
        }
    }, [date]);

    const handleDeleteOrder = async (orderToRemove) => {
        // Remove from local state immediately for snappy UI
        setRecentOrders(prev => prev.filter(o => o !== orderToRemove));

        // Hide permanently in backend
        if (window.electron && user) {
            try {
                await window.electron.hideUserOrder({ projectManager: user, orderNr: orderToRemove });
            } catch (err) {
                console.error("Failed to hide order", err);
            }
        }
    };

    // ... (Validation logic remains same, just ensure we update Recent Orders after save)

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validations
        const isAbsent = orderNr.trim().toLowerCase() === ABSENT_ORDER_NR.toLowerCase();

        if (!isAbsent) {
            if (dayInfo.type === 'Feiertag' || dayInfo.type.includes('Brückentag') || dayInfo.type === 'Sonntag') {
                setError(`Cannot add entries on ${dayInfo.type} (${dayInfo.name || 'Sunday/Holiday'}).`);
                return;
            }

            if (!/^\d{6,8}$/.test(orderNr)) {
                setError('Order Number must be 6-8 digits.');
                return;
            }
        }

        if (isAbsent && endDate) {
            const startStr = parseISO(date);
            const endStr = parseISO(endDate);
            if (isBefore(endStr, startStr)) {
                setError('End Date must be after or equal to Start Date.');
                return;
            }
        }

        // Check Daily Limit
        try {
            if (window.electron) {
                const currentSum = await window.electron.getDailySum({ projectManager: user, date });
                const newTotal = currentSum + parseFloat(duration);
                if (newTotal > 10) {
                    setError(`Daily limit exceeded! Current: ${currentSum}h. Adding ${duration}h would make it ${newTotal}h (Max 10h).`);
                    return;
                }
            }
        } catch (err) {
            console.error("Error checking daily sum:", err);
            setError("System Error: Could not validate daily limit.");
            return;
        }

        try {
            if (window.electron) {
                if (isAbsent && endDate && endDate !== date) {
                    // Logic for multi-day absence
                    const startStr = parseISO(date);
                    const endStr = parseISO(endDate);
                    const entriesToSave = [];
                    let currentDate = startStr;

                    // Iterate through the date range
                    while (isBefore(currentDate, endStr) || isEqual(currentDate, endStr)) {
                        const dateString = format(currentDate, 'yyyy-MM-dd');
                        const info = getDayInfo(dateString);

                        // Skip Weekends and Holidays automatically
                        if (info.type === 'Werktag' || info.type === 'Samstag') {
                            entriesToSave.push({
                                projectManager: user,
                                date: dateString,
                                orderNr: ABSENT_ORDER_NR,
                                duration: parseFloat(duration),
                                dayType: info.type,
                                comment
                            });
                        }
                        currentDate = addDays(currentDate, 1);
                    }

                    if (entriesToSave.length === 0) {
                        setError('No valid workdays found in the selected range.');
                        return;
                    }

                    await window.electron.addEntries(entriesToSave);
                    setSuccess(`Absence added successfully for ${entriesToSave.length} valid days!`);
                } else {
                    // Make sure we have valid day type for a single entry
                    if (dayInfo.type !== 'Werktag' && dayInfo.type !== 'Samstag') {
                        setError(`Cannot add entry on ${dayInfo.type}.`);
                        return;
                    }

                    // Standard single entry
                    await window.electron.addEntry({
                        projectManager: user,
                        date,
                        orderNr: isAbsent ? ABSENT_ORDER_NR : orderNr,
                        duration: parseFloat(duration),
                        dayType: dayInfo.type,
                        comment
                    });
                    setSuccess('Entry added successfully!');
                }

                setComment(''); // Reset optional fields
                if (isAbsent) setEndDate(''); // Reset end date

                // Smart Feature: Add this order to the local list immediately if not present
                if (!isAbsent && !recentOrders.includes(orderNr)) {
                    setRecentOrders(prev => [orderNr, ...prev].slice(0, 50));
                }

                // Trigger refresh in parent
                if (onEntryAdded) onEntryAdded();
            } else {
                console.warn('Electron API not available');
                setError('System Error: Database not connected.');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to save entry.');
        }
    };

    const durationOptions = [];
    for (let i = 0.5; i <= 10.0; i += 0.5) {
        durationOptions.push(i);
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Date</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                        const newDate = e.target.value;
                        setDate(newDate);
                        if (onDateSelect) onDateSelect(newDate);
                    }}
                    required
                />
                <div className="text-sm">
                    Type: <span style={{
                        color: (dayInfo.type === 'Werktag' || dayInfo.type === 'Samstag') ? 'var(--success)' : 'var(--danger)'
                    }}>{dayInfo.type} {dayInfo.name && `- ${dayInfo.name}`}</span>
                </div>
            </div>

            <div className="form-group">
                <label>Order Number</label>
                <OrderSelect
                    value={orderNr}
                    recentOrders={recentOrders}
                    onDeleteOrder={handleDeleteOrder}
                    onChange={(val) => {
                        // Prevent user from manually typing 'Absent'
                        if (val.trim().toLowerCase() === ABSENT_ORDER_NR.toLowerCase()) {
                            return; // Ignore the keystroke
                        }
                        setOrderNr(val);
                        // If they are clearing out a previously set absentee status
                        if (val.trim().toLowerCase() !== ABSENT_ORDER_NR.toLowerCase()) {
                            setEndDate('');
                        }
                    }}
                />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                    {orderNr.trim().toLowerCase() !== ABSENT_ORDER_NR.toLowerCase() && (
                        <div
                            className="text-sm"
                            style={{ color: 'var(--primary)', cursor: 'pointer' }}
                            onClick={() => {
                                setOrderNr(ABSENT_ORDER_NR);
                                setEndDate('');
                            }}
                        >
                            Mark as Absent
                        </div>
                    )}
                    {orderNr && (
                        <div
                            className="text-sm"
                            style={{ color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => {
                                setOrderNr('');
                                setEndDate('');
                            }}
                        >
                            Clear Input
                        </div>
                    )}
                </div>
            </div>

            {orderNr.trim().toLowerCase() === ABSENT_ORDER_NR.toLowerCase() && (
                <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                    <label>End Date (Optional, for multi-day absence)</label>
                    <input
                        type="date"
                        value={endDate}
                        min={date} // Prevent picking dates before start date visually
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        If an end date is picked, we will automatically skip weekends and holidays for you.
                    </div>
                </div>
            )}

            <div className="form-group">
                <label>Duration (Hours)</label>
                <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                >
                    {durationOptions.map(h => (
                        <option key={h} value={h}>{h} h</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label>Comment (Optional)</label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                />
            </div>

            {error && <div className="text-danger">{error}</div>}
            {success && <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>{success}</div>}

            {/* Button disabled only if it's a single day AND day is not Werktag/Samstag. Handled gracefully for absent periods inside the submit logic. */}
            <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
                disabled={!(orderNr.trim().toLowerCase() === ABSENT_ORDER_NR.toLowerCase() && endDate) && dayInfo.type !== 'Werktag' && dayInfo.type !== 'Samstag'}
            >
                Save Entry
            </button>
        </form>
    );
}
