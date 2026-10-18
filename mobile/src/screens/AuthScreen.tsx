import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, User, Phone, ArrowRight, AlertCircle, Sparkles, CheckCircle, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const AuthScreen: React.FC = () => {
  const { login, register, sendOtp, loadDemoAccount } = useAuth();
  const { colors } = useTheme();

  const [isRegister, setIsRegister] = useState(false);
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await sendOtp(email.trim(), 'REGISTRATION');
      setRegisterStep('otp');
      setResendTimer(60);
      if (res.dev_code) {
        setDevOtpHint(res.dev_code);
        setSuccessMessage(`Verification code generated: ${res.dev_code}`);
      } else {
        setDevOtpHint(null);
        setSuccessMessage(`Verification code sent to ${email.trim()}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await sendOtp(email.trim(), 'REGISTRATION');
      setResendTimer(60);
      if (res.dev_code) {
        setDevOtpHint(res.dev_code);
        setSuccessMessage(`New code generated: ${res.dev_code}`);
      } else {
        setSuccessMessage(`A new verification code was sent to ${email.trim()}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isRegister) {
      if (registerStep === 'form') {
        await handleSendOtp();
      } else {
        // Step 2: Complete registration with OTP
        if (otpCode.trim().length !== 6) {
          setErrorMessage('Please enter the 6-digit verification code');
          return;
        }

        setIsLoading(true);
        try {
          await register({
            email: email.trim(),
            full_name: fullName.trim(),
            password,
            phone_number: phoneNumber.trim() || undefined,
            otp: otpCode.trim()
          });
        } catch (err: any) {
          setErrorMessage(err.message || 'Verification failed. Please check your code.');
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      // Standard Login
      setIsLoading(true);
      try {
        await login(email.trim(), password);
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid email or password.');
      } finally {
        setIsLoading(false);
      }
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

  const toggleMode = (registerMode: boolean) => {
    setIsRegister(registerMode);
    setRegisterStep('form');
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpCode('');
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      overflowY: 'auto',
      backgroundColor: colors.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
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
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #0D9488 0%, #1E3A8A 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35)',
            marginBottom: 12,
          }}>
            <ShieldCheck size={32} color="#FFFFFF" />
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

        {/* Quick Demo Access Button */}
        {!isRegister && (
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
            <span>✨ Instant Demo Access (Preloaded Vault)</span>
          </button>
        )}

        {/* Section Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
          <span style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>
            {isRegister ? (registerStep === 'otp' ? 'Step 2: Verify Email' : 'Step 1: Account Details') : 'Sign in with Email'}
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: colors.surfaceBorder }} />
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 12,
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #EF4444',
            color: '#FCA5A5',
            fontSize: 13,
            marginBottom: 16,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 12,
            backgroundColor: 'rgba(13, 148, 136, 0.15)',
            border: '1px solid #0D9488',
            color: '#5EEAD4',
            fontSize: 13,
            marginBottom: 16,
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* STEP 1: Registration Form or Login Form */}
          {(!isRegister || registerStep === 'form') && (
            <>
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
                    borderRadius: 12,
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
                  borderRadius: 12,
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
                  borderRadius: 12,
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
                    borderRadius: 12,
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
                  marginTop: 6,
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : isRegister ? (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    <span>Sign In to Vault</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </>
          )}

          {/* STEP 2: Enter 6-digit OTP Code */}
          {isRegister && registerStep === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                textAlign: 'center',
                padding: '12px 14px',
                borderRadius: 14,
                backgroundColor: 'rgba(13, 148, 136, 0.08)',
                border: '1px solid rgba(13, 148, 136, 0.25)',
              }}>
                <div style={{ fontSize: 13, color: colors.textMuted }}>
                  We sent a 6-digit verification code to:
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.accent, marginTop: 2 }}>
                  {email}
                </div>
                <button
                  type="button"
                  onClick={() => setRegisterStep('form')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3B82F6',
                    fontSize: 12,
                    cursor: 'pointer',
                    marginTop: 6,
                    textDecoration: 'underline',
                  }}
                >
                  Change email address
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 8, textAlign: 'center' }}>
                  Enter 6-Digit Code
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 14,
                  backgroundColor: colors.surfaceCard,
                  border: `2px solid ${colors.accent}`,
                }}>
                  <KeyRound size={20} color={colors.accent} />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      color: colors.text,
                      fontSize: 24,
                      fontWeight: 800,
                      letterSpacing: 8,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Resend Code Button & Timer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendTimer > 0 ? colors.textMuted : colors.accent,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: resendTimer > 0 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
                  <span>{resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRegisterStep('form')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.textMuted,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: colors.accent,
                  color: '#FFF',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: (isLoading || otpCode.length !== 6) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 8,
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
                  opacity: (isLoading || otpCode.length !== 6) ? 0.6 : 1,
                }}
              >
                {isLoading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Verify & Create Vault</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        {/* Toggle between Login and Register */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: colors.textMuted }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                onClick={() => toggleMode(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.accent,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                onClick={() => toggleMode(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.accent,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
