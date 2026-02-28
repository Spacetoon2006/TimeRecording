import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose, targetUsername, isSelfChange = true }) {
    if (!isOpen) return null;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword.length < 4) {
            setError("Password is too short.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            if (window.electron) {
                // If isSelfChange, we assume targetUsername IS the current user's username.
                // If Admin reset, targetUsername is the victim's username.

                // Note: Our Backend `update-password` takes { username, newPassword }.
                // We need to ensure `targetUsername` is the simple username (e.g. "Ralf"), not Full Name.

                const result = await window.electron.updatePassword({
                    username: targetUsername,
                    newPassword
                });

                if (result.success) {
                    setSuccess("Password updated successfully!");
                    setTimeout(() => {
                        onClose();
                        setNewPassword('');
                        setConfirmPassword('');
                        setSuccess('');
                    }, 1500);
                } else {
                    setError("Failed to update password. User not found?");
                }
            }
        } catch (err) {
            console.error(err);
            setError("System Error.");
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{ width: '400px', border: '1px solid var(--glass-border)' }}>
                <h3 className="text-xl mb-4">{isSelfChange ? "Change Password" : `Reset Password for ${targetUsername}`}</h3>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>New Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
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
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm new password"
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

                    {error && <div className="text-danger mb-2">{error}</div>}
                    {success && <div className="text-success mb-2">{success}</div>}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                        <button type="button" onClick={onClose} className="btn btn-text" style={{ flex: 1 }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
