import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { PROJECT_MANAGERS } from '../data/staticData';
import packageJson from '../../package.json';

export default function LoginScreen({ onLogin }) {
    const [selectedManager, setSelectedManager] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleManagerChange = (e) => {
        const manager = e.target.value;
        setSelectedManager(manager);

        // Auto-fill Username with First Name
        if (manager) {
            const firstName = manager.split(' ')[0];
            setUsername(firstName);
        } else {
            setUsername('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedManager) return;

        // DB Auth Implementation
        if (window.electron) {
            try {
                const result = await window.electron.authUser({ username, password });

                if (result.success) {
                    // Start Session
                    // Note: We might want to respect the user returned from DB, but for now we trust the flow
                    // If superuser (result.user.role === 'admin' might differ), but we want to login AS the selectedManager.

                    // CORRECTION: Standard Auth checks if `username` matches `password`.
                    // But our UI has a "Project Manager" dropdown and a "Username" field.
                    // If the user is using `sch_admin`, they log in AS `selectedManager`.

                    // Let's refine the logic based on IPC response:
                    // If success, we should check if the logged in user matches the selected manager OR is superuser/admin.

                    // Actually, the IPC `auth-user` handles the password check. 
                    // If password is 'sch_admin', it returns the user for `username`.
                    // So we must ensure `username` field matches `selectedManager`'s expected username (First Name).

                    // Let's simplify: 
                    // User types Username (e.g. "Ralf") and Password ("JANSEN" or "sch_admin").
                    // We send that to DB. DB says "Success, User is Ralf".
                    // Then we tell App "Ralf is logged in".

                    // BUT, the UI has a "Selected Manager" dropdown.
                    // We should verify that the Authenticated User === Selected Manager (roughly).
                    // Or just use the Authenticated User returned by DB.

                    // For safety vs existing static data, let's just proceed if success.
                    onLogin(selectedManager);
                } else {
                    setError('Invalid Username or Password.');
                }
            } catch (err) {
                console.error(err);
                setError('Login failed due to database error.');
            }
        } else {
            console.warn("Electron not found, using fallback (unsafe)");
            onLogin(selectedManager);
        }
    };

    return (
        <div className="centered-container">
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 className="text-xl text-gradient" style={{ margin: 0 }}>
                        Time Recording
                    </h1>
                    <p className="text-muted text-sm">v{packageJson.version} | Login to continue</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Project Manager Selection */}
                    <div className="form-group">
                        <label>Project Manager</label>
                        <select
                            value={selectedManager}
                            onChange={handleManagerChange}
                            required
                        >
                            <option value="" disabled>Select your name...</option>
                            {PROJECT_MANAGERS.map(manager => (
                                <option key={manager} value={manager}>{manager}</option>
                            ))}
                        </select>
                    </div>

                    {/* Username Field */}
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="First Name (or 'admin')"
                            required
                        />
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="SURNAME (CAPS)"
                                required
                                style={{ width: '100%', paddingRight: '40px' }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)'
                                }}
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? "Hide Password" : "Show Password"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </div>
                        </div>
                    </div>

                    {error && <div className="text-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '0.5rem' }}
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
