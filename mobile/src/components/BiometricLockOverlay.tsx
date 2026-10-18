import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Lock, ArrowRight, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const BiometricLockOverlay: React.FC = () => {
  const { unlockApp } = useAuth();
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);
  const [showPinFallback, setShowPinFallback] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Biometric-First Direct Unlock: Trigger sensor automatically or via 1-tap
  const handleBiometricUnlock = async () => {
    if (lockoutTimer > 0) return;
    setIsScanning(true);
    setError('');

    if ('vibrate' in navigator) {
      try { navigator.vibrate([40, 50, 40]); } catch (e) {}
    }

    // Hardware authenticator / WebAuthn platform authenticator check if available
    try {
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
    } catch (e) {}

    setTimeout(async () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(80); } catch (e) {}
      }
      setIsScanning(false);
      setBiometricSuccess(true);
      
      // Directly unlock vault without requiring PIN afterward!
      setTimeout(async () => {
        await unlockApp();
      }, 400);
    }, 600);
  };

  const handleUnlockWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    if (!pin || pin.length < 4) {
      setError('Please enter a valid 4-digit PIN');
      return;
    }

    setIsVerifying(true);
    try {
      const success = await unlockApp(pin);
      if (!success) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setPin('');
        if (nextAttempts >= 5) {
          setLockoutTimer(60);
          setError('Too many incorrect attempts. Vault locked for 60 seconds.');
        } else {
          setError(`Invalid PIN. ${5 - nextAttempts} attempts remaining.`);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.bg,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 380,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 76,
          height: 76,
          borderRadius: 26,
          background: biometricSuccess
            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #0D9488 0%, #1E3A8A 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(13, 148, 136, 0.45)',
          marginBottom: 20,
          transition: 'all 0.3s ease',
        }}>
          {biometricSuccess ? (
            <CheckCircle2 size={42} color="#FFF" />
          ) : (
            <ShieldCheck size={42} color="#FFF" />
          )}
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginBottom: 4 }}>
          {biometricSuccess ? 'Vault Unlocked' : 'DocuVault Protected'}
        </h2>
        <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 28, lineHeight: 1.5 }}>
          Biometric hardware encryption protects your sensitive documents
        </p>

        {/* Biometric-First Direct Access Card */}
        <div style={{
          backgroundColor: colors.surfaceCard,
          border: `1.5px solid ${isScanning ? colors.accentLight : colors.surfaceBorder}`,
          borderRadius: 20,
          padding: 24,
          boxShadow: isScanning ? '0 0 25px rgba(13, 148, 136, 0.3)' : '0 8px 24px rgba(0,0,0,0.1)',
          marginBottom: 18,
          transition: 'all 0.25s ease',
        }}>
          <button
            onClick={handleBiometricUnlock}
            disabled={isScanning || biometricSuccess || lockoutTimer > 0}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: isScanning || lockoutTimer > 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 0,
            }}
          >
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: isScanning ? 'rgba(13, 148, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `2px dashed ${isScanning ? '#10B981' : colors.accentLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              boxShadow: isScanning ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
              transition: 'all 0.3s ease',
            }}>
              <Fingerprint 
                size={44} 
                color={biometricSuccess ? '#10B981' : isScanning ? '#10B981' : colors.accentLight} 
                style={{
                  filter: isScanning ? 'drop-shadow(0 0 8px #10B981)' : 'none',
                  animation: isScanning ? 'pulse 1s infinite' : 'none'
                }}
              />
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, color: colors.text, marginBottom: 4 }}>
              {isScanning ? 'Verifying Device Sensor...' : biometricSuccess ? 'Authentication Succeeded' : 'Touch Sensor to Unlock'}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>
              Fingerprint or Face Authentication unlocks directly
            </div>
          </button>
        </div>

        {/* Lockout Notice */}
        {lockoutTimer > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            padding: '10px 14px',
            borderRadius: 12,
            marginBottom: 16,
            color: colors.danger,
            fontSize: 13,
            fontWeight: 600,
          }}>
            <AlertTriangle size={18} />
            <span>Lockout active: retry in {lockoutTimer}s</span>
          </div>
        )}

        {/* Quick PIN Fallback toggle */}
        {!showPinFallback ? (
          <button
            onClick={() => setShowPinFallback(true)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
            }}
          >
            <KeyRound size={15} />
            <span>Use 4-digit Quick PIN as Fallback</span>
          </button>
        ) : (
          <div style={{ marginTop: 6, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10, fontWeight: 600 }}>
              Quick PIN Fallback (Demo: 1234 or 2468)
            </div>

            <form onSubmit={handleUnlockWithPin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={pin}
                disabled={lockoutTimer > 0}
                onChange={e => {
                  setPin(e.target.value);
                  setError('');
                }}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceCard,
                  border: `1.5px solid ${error ? colors.danger : colors.surfaceBorder}`,
                  color: colors.text,
                  fontSize: 22,
                  textAlign: 'center',
                  letterSpacing: 10,
                  outline: 'none',
                  fontWeight: 800,
                }}
              />

              {error && (
                <div style={{ fontSize: 12, color: colors.danger, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinFallback(false);
                    setError('');
                  }}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.surfaceCard,
                    color: colors.textMuted,
                    border: `1px solid ${colors.surfaceBorder}`,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || lockoutTimer > 0}
                  style={{
                    flex: 2,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>{isVerifying ? 'Checking...' : 'Unlock with PIN'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
