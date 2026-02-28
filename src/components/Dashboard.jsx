import React, { useState, useEffect } from 'react';
import TimeEntryForm from './TimeEntryForm';
import WeeklyView from './WeeklyView';
import ChangePasswordModal from './ChangePasswordModal';
import AdminAnalytics from './AdminAnalytics';

import { format } from 'date-fns';
import { PROJECT_MANAGERS } from '../data/staticData';

// ── Compact update status widget ─────────────────────────────────────────────
function UpdateChecker() {
    const [status, setStatus] = useState('idle');
    const [info, setInfo] = useState('');

    // Auto-reset "up to date" after 5 s so user can check again
    useEffect(() => {
        if (status === 'uptodate') {
            const t = setTimeout(() => setStatus('idle'), 5000);
            return () => clearTimeout(t);
        }
    }, [status]);

    useEffect(() => {
        if (!window.electron) return;
        window.electron.onUpdateAvailable((v) => { setStatus('available'); setInfo(v); });
        window.electron.onUpdateNotAvailable(() => setStatus('uptodate'));
        window.electron.onUpdateDownloadProgress((pct) => { setStatus('downloading'); setInfo(`${pct}%`); });
        window.electron.onUpdateDownloaded((v) => { setStatus('ready'); setInfo(v); });
        window.electron.onUpdateError((msg) => { setStatus('error'); setInfo(msg); });
    }, []);

    const check = async () => {
        if (!window.electron) return;
        setStatus('checking'); setInfo('');
        const r = await window.electron.checkForUpdate();
        // In dev mode the backend returns { dev: true } — treat as "up to date"
        if (r?.dev) setStatus('uptodate');
    };

    const s = {
        idle: { icon: '🔄', text: 'Check for Updates', action: check, color: '#94a3b8' },
        checking: { icon: '⏳', text: 'Checking…', action: null, color: '#94a3b8' },
        uptodate: { icon: '✅', text: `v${__APP_VERSION__} — Latest`, action: null, color: '#10b981' },
        available: { icon: '⬇', text: `v${info} available — Download`, action: () => window.electron.downloadUpdate(), color: '#3b82f6' },
        downloading: { icon: '⏬', text: `Downloading… ${info}`, action: null, color: '#f59e0b' },
        ready: { icon: '🔁', text: 'Restart to install', action: () => window.electron.installUpdate(), color: '#10b981' },
        error: { icon: '❌', text: 'Check failed — retry', action: check, color: '#ef4444' },
    }[status] ?? { icon: '🔄', text: 'Check for Updates', action: check, color: '#94a3b8' };

    return (
        <button onClick={s.action ?? undefined} disabled={!s.action}
            title={status === 'error' ? info : `App version ${__APP_VERSION__}`}
            style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${s.color}40`,
                borderRadius: '20px', padding: '0.2rem 0.65rem',
                color: s.color, fontSize: '0.72rem', fontWeight: 500,
                cursor: s.action ? 'pointer' : 'default', width: 'auto',
                transition: 'all 0.2s',
            }}
        >
            <span>{s.icon}</span> <span>{s.text}</span>
        </button>
    );
}


export default function Dashboard({ user, onLogout }) {
    const [refreshKey, setRefreshKey] = useState(0);
    const [viewDate, setViewDate] = useState(new Date());

    // Password Modal State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordTarget, setPasswordTarget] = useState('');
    const [isSelfChange, setIsSelfChange] = useState(true);

    const handleEntryAdded = () => {
        // Increment key to trigger WeeklyView refresh
        setRefreshKey(prev => prev + 1);
    };

    const handleDateChange = (newDateStr) => {
        // When form date changes, update the view date so WeeklyView switches to that week
        setViewDate(new Date(newDateStr));
    };

    const handleExport = async () => {
        if (!window.electron) return;
        const result = await window.electron.exportData({ projectManager: user });
        if (result.success) {
            alert(result.message);
        } else {
            // Simple alert for now, could be better UI
            alert(result.message);
        }
    };

    const handleGlobalExport = async () => {
        if (!window.electron) return;
        const result = await window.electron.exportAllData();
        alert(result.message);
    };

    // Open modal for self
    const openChangePassword = () => {
        // We assume username = First Name for simplicity in this system
        const firstName = user.split(' ')[0];
        setPasswordTarget(firstName);
        setIsSelfChange(true);
        setIsPasswordModalOpen(true);
    };

    // Admin View for Ahmed
    const [reviewUser, setReviewUser] = useState('');
    const [adminActiveTab, setAdminActiveTab] = useState('review'); // 'review' | 'analytics'

    // Open modal for admin reset
    const openAdminReset = () => {
        if (!reviewUser) return;
        const firstName = reviewUser.split(' ')[0];
        setPasswordTarget(firstName);
        setIsSelfChange(false); // Admin mode
        setIsPasswordModalOpen(true);
    };

    if (user === 'Ahmed Al-Dajani') {
        const managersToReview = PROJECT_MANAGERS.filter(m => m !== 'Ahmed Al-Dajani');

        return (
            <div className="dashboard-container">
                <ChangePasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                    targetUsername={passwordTarget}
                    isSelfChange={isSelfChange}
                />

                <header className="card header-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="text-xl">Welcome, <span className="text-gradient">Admin {user}</span></h2>
                        <p className="text-muted text-sm">Head of Department - Reviewer Mode</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem', borderRadius: '8px' }}>
                        <button
                            className={`btn ${adminActiveTab === 'review' ? 'btn-primary' : 'btn-text'}`}
                            onClick={() => setAdminActiveTab('review')}
                        >
                            Review Entries
                        </button>
                        <button
                            className={`btn ${adminActiveTab === 'analytics' ? 'btn-primary' : 'btn-text'}`}
                            onClick={() => setAdminActiveTab('analytics')}
                        >
                            Company Analytics
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <UpdateChecker />
                        <span style={{ fontSize: '0.72rem', color: '#475569', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '0.2rem 0.6rem' }}>
                            v{__APP_VERSION__}
                        </span>
                        <button onClick={openChangePassword} className="btn btn-text">Change Password</button>
                        <button onClick={onLogout} className="btn btn-text">Logout</button>
                    </div>
                </header>

                {adminActiveTab === 'analytics' ? (
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <AdminAnalytics />
                    </div>
                ) : (
                    <div className="dashboard-grid">
                        {/* Left: Export & Selection */}
                        <div>
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <h3 className="card-title">Global Data Export</h3>
                                <p className="text-muted text-sm mb-2">
                                    Download time records from ALL Project Managers.
                                </p>
                                <button
                                    onClick={handleGlobalExport}
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                >
                                    Download Global Excel (.xlsx)
                                </button>
                            </div>

                            <div className="card">
                                <h3 className="card-title">Review Entries</h3>
                                <p className="text-muted text-sm mb-2">Select a Project Manager to view their weekly entries.</p>
                                <select
                                    value={reviewUser}
                                    onChange={(e) => setReviewUser(e.target.value)}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}
                                >
                                    <option value="" style={{ backgroundColor: '#1e293b', color: 'white' }}>-- Select Project Manager --</option>
                                    {managersToReview.map(m => (
                                        <option key={m} value={m} style={{ backgroundColor: '#1e293b', color: 'white' }}>{m}</option>
                                    ))}
                                </select>

                                {reviewUser && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                        <button
                                            onClick={openAdminReset}
                                            className="btn btn-text text-danger"
                                            style={{ width: '100%', textAlign: 'left' }}
                                        >
                                            ⚠️ Reset Password for {reviewUser.split(' ')[0]}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Weekly View (if user selected) */}
                        <div>
                            {reviewUser ? (
                                <WeeklyView
                                    user={reviewUser}
                                    refreshTrigger={refreshKey} // Standard trigger, though Admin can't edit presumably? Or can he? WeeklyView allows delete. 
                                // Ideally Admin should just VIEW, but deleting might be useful.
                                // Let's keep it as is, he uses the same WeeklyView.
                                />
                            ) : (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                    <p>Select a user to review their calendar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                targetUsername={passwordTarget}
                isSelfChange={isSelfChange}
            />

            <header className="card header-card">
                <div>
                    <h2 className="text-xl">Welcome, <span className="text-gradient">{user}</span></h2>
                    <p className="text-muted text-sm">Time Recording Dashboard</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <UpdateChecker />
                    <span style={{ fontSize: '0.72rem', color: '#475569', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '0.2rem 0.6rem' }}>
                        v{__APP_VERSION__}
                    </span>
                    <button onClick={openChangePassword} className="btn btn-text">Change Password</button>
                    <button onClick={onLogout} className="btn btn-text">Logout</button>
                </div>
            </header>


            <div className="dashboard-grid">
                {/* Left Column: Form */}
                <div>
                    <div className="card">
                        <h3 className="card-title">New Entry</h3>
                        <TimeEntryForm
                            user={user}
                            onEntryAdded={handleEntryAdded}
                            onDateSelect={handleDateChange}
                        />
                    </div>

                    <div className="card" style={{ marginTop: '1.5rem' }}>
                        <h3 className="card-title text-sm">Export</h3>
                        <p className="text-muted text-sm mb-2">Export data for Excel.</p>
                        <button
                            onClick={handleExport}
                            className="btn btn-text"
                            style={{ border: '1px solid var(--glass-border)' }}
                        >
                            Download Excel (.xlsx)
                        </button>
                    </div>
                </div>

                {/* Right Column: Weekly View */}
                <div>
                    <WeeklyView
                        user={user}
                        refreshTrigger={refreshKey}
                        forcedDate={viewDate}
                    />
                </div>
            </div>
        </div>
    );
}
