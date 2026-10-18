import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, Phone, ArrowRight, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const AuthScreen: React.FC = () => {
  const { login, register, loadDemoAccount } = useAuth();
  const { colors } = useTheme();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Please enter your full name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await register({
          email: email.trim(),
          full_name: fullName.trim(),
          password,
          phone_number: phoneNumber.trim() || undefined,
        });
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loadDemoAccount();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize demo account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      overflowY: 'auto',
      backgroundColor: colors.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        backgroundColor: colors.surface,
        borderRadius: 24,
        border: `1px solid ${colors.surfaceBorder}`,
        padding: '32px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Logo and App Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #0D9488 0%, #1E3A8A 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(13, 148, 136, 0.4)',
            marginBottom: 12,
          }}>
            <ShieldCheck size={30} color="#FFFFFF" />
          </div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 26,
            fontWeight: 800,
            color: colors.text,
            letterSpacing: -0.5,
          }}>
            Docu<span style={{ color: colors.accent }}>Vault</span>
          </h1>
          <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            Smart Digital Document Locker & Family Emergency Vault
          </p>
        </div>

        {/* Quick Demo Button */}
        <button
          onClick={handleQuickDemo}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 14,
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            color: '#3B82F6',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: 20,
            transition: 'all 0.2s',
          }}
        >
          <Sparkles size={16} />
          <span>⚡ Instant Demo Access (Preloaded Vault)</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
          <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>
            {isRegister ? 'Register Account' : 'Sign in with Email'}
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
        </div>

        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 10,
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            color: '#FCA5A5',
            fontSize: 13,
            marginBottom: 16,
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                Full Name *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
              }}>
                <User size={16} color={colors.textMuted} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: colors.text,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Email Address *
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.surfaceBorder}`,
            }}>
              <Mail size={16} color={colors.textMuted} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: colors.text,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Password *
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.surfaceBorder}`,
            }}>
              <Lock size={16} color={colors.textMuted} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  color: colors.text,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                Phone Number (Optional)
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
              }}>
                <Phone size={16} color={colors.textMuted} />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    color: colors.text,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: colors.accent,
              color: '#FFF',
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
              marginTop: 6,
            }}
          >
            <span>{isLoading ? 'Authenticating...' : isRegister ? 'Create Secure Account' : 'Sign In to Vault'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMessage(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.accentLight,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
          </button>
        </div>
      </div>
    </div>
  );
};
