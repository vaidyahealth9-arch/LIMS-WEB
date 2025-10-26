import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Failed to login. Check username or password.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'relative',
      height: '100vh', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(135deg, #0e7490 0%, #155e75 50%, #164e63 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      {/* Background Image - Centered */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        opacity: isMobile ? 0.3 : 1
      }}>
        <img 
          src="/images/index.png" 
          alt="LIMS - Laboratory Information Management System"
          style={{ 
            maxWidth: isMobile ? '100vw' : '90vw',
            maxHeight: isMobile ? '100vh' : '90vh',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Login Form - Centered on Top */}
      <div style={{ 
        position: 'relative',
        zIndex: 2,
        padding: isMobile ? '1rem' : '2rem',
        marginTop: isMobile ? '0' : '10rem'
      }}>
        <form onSubmit={handleLogin} style={{ 
          width: '100%',
          maxWidth: isMobile ? '100%' : '440px',
          padding: isMobile ? '2rem 1.5rem' : '3rem',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          background: isMobile ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: isMobile ? 'blur(12px)' : 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          {/* Header */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem', textAlign: 'center' }}>
            <h2 style={{
              fontSize: isMobile ? '28px' : '32px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.5rem',
              letterSpacing: '-0.5px'
            }}>Sign In</h2>
            <p style={{
              fontSize: isMobile ? '13px' : '14px',
              color: '#64748b',
              fontWeight: 400
            }}>Enter your credentials to access the system</p>
          </div>

          {/* Error Message */}
          {error && <div style={{ 
            color: '#dc2626', 
            backgroundColor: '#fee2e2',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '14px',
            border: '1px solid #fecaca',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '18px' }}>⚠</span>
            {error}
          </div>}

          {/* Username Field */}
          <div style={{ marginBottom: isMobile ? '1.25rem' : '1.5rem' }}>
            <label htmlFor="username" style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              color: '#1e293b',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600
            }}>Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ 
                width: '100%', 
                padding: isMobile ? '0.75rem' : '0.875rem',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                fontSize: isMobile ? '14px' : '15px',
                transition: 'all 0.2s ease',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0891b2';
                e.target.style.boxShadow = '0 0 0 3px rgba(8, 145, 178, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Enter your username"
              required
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: isMobile ? '1.25rem' : '1.5rem' }}>
            <label htmlFor="password" style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              color: '#1e293b',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 600
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: isMobile ? '0.75rem' : '0.875rem',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  fontSize: isMobile ? '14px' : '15px',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  paddingRight: '3rem',
                  backgroundColor: '#ffffff'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0891b2';
                  e.target.style.boxShadow = '0 0 0 3px rgba(8, 145, 178, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#64748b',
                  transition: 'color 0.2s',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0891b2'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isLoading}
            style={{ 
              width: '100%', 
              padding: isMobile ? '0.75rem' : '0.875rem',
              background: isLoading 
                ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)' 
                : 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: isMobile ? '15px' : '16px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginTop: '0.5rem',
              boxShadow: '0 4px 12px rgba(8, 145, 178, 0.3)',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: isLoading ? 0.8 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(8, 145, 178, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(8, 145, 178, 0.3)';
              }
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '3px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <span>Signing In...</span>
                <style>
                  {`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}
                </style>
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Footer Text */}
          <div style={{ 
            marginTop: '1.5rem', 
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748b'
          }}>
            Secure access to your laboratory dashboard
          </div>
        </form>
      </div>
    </div>
  );
}