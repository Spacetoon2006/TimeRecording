import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ArrowDownAZ, ArrowUpZA } from 'lucide-react';

export default function OrderSelect({
    value,
    onChange,
    recentOrders,
    onDeleteOrder,
    placeholder = "Please type or select a PO number",
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAscending, setIsAscending] = useState(true);
    const wrapperRef = useRef(null);

    const sortedOrders = useMemo(() => {
        if (!recentOrders) return [];
        return [...recentOrders].sort((a, b) => {
            if (isAscending) {
                return a.localeCompare(b, undefined, { numeric: true });
            } else {
                return b.localeCompare(a, undefined, { numeric: true });
            }
        });
    }, [recentOrders, isAscending]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                required
                autoComplete="off"
                disabled={disabled}
                style={{ width: '100%', paddingRight: '30px' }} // Room for dropdown arrow
            />
            {/* Fake Dropdown Arrow to look like select */}
            <div
                style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--text-muted)'
                }}
            >
                ▼
            </div>

            {isOpen && recentOrders.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    marginTop: '4px',
                    backgroundColor: '#1e293b', // Solid color to prevent text bleed-through
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
                }}>
                    {/* Toolbar / Sort Toggle */}
                    <div style={{
                        padding: '6px 12px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        borderBottom: '1px solid var(--glass-border)',
                        backgroundColor: 'rgba(255,255,255,0.02)'
                    }}>
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsAscending(!isAscending);
                            }}
                            style={{
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-color)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            {isAscending ? <ArrowDownAZ size={14} /> : <ArrowUpZA size={14} />}
                            {isAscending ? "Sorted Ascending" : "Sorted Descending"}
                        </div>
                    </div>

                    {sortedOrders.map((order) => (
                        <div
                            key={order}
                            style={{
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span
                                style={{ flex: 1, paddingRight: '10px' }}
                                onClick={() => {
                                    onChange(order);
                                    setIsOpen(false);
                                }}
                            >
                                {order}
                            </span>
                            <div
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent row click
                                    if (onDeleteOrder) onDeleteOrder(order);
                                }}
                                style={{
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    color: 'var(--text-muted)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.color = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-muted)';
                                }}
                                title="Remove from history"
                            >
                                <X size={14} />
                            </div>
                        </div>
                    ))}

                    {/* Permanent Default Option */}
                    <div
                        style={{
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            borderTop: recentOrders.length > 0 ? '1px solid var(--glass-border)' : 'none',
                            backgroundColor: 'rgba(255,255,255,0.02)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                        onClick={() => {
                            onChange('990005');
                            setIsOpen(false);
                        }}
                    >
                        <span style={{ flex: 1, paddingRight: '10px', color: 'var(--primary)' }}>
                            990005 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(General Activities)</span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
