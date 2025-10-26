import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError('Failed to login. Check username or password.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <img 
          src="/images/index.png" 
          alt="LIMS - Laboratory Information Management System"
          style={{ 
            maxWidth: '80%',
            maxHeight: '80%',
            objectFit: 'contain'
          }}
        />
      </div>
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: 'white'
      }}>
        <form onSubmit={handleLogin} style={{ 
          width: '400px',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          background: 'white'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>Welcome Back</h2>
          {error && <p style={{ 
            color: '#dc2626', 
            backgroundColor: '#fee2e2',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '14px'
          }}>{error}</p>}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="username" style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 500
            }}>Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                fontSize: '16px',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              placeholder="Enter your username"
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              color: '#475569',
              fontSize: '14px',
              fontWeight: 500
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  fontSize: '16px',
                  transition: 'border-color 0.2s',
                  outline: 'none',
                  paddingRight: '2.5rem'
                }}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#64748b'
                }}
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              padding: '0.75rem',
              backgroundColor: '#0891b2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              marginTop: '1rem'
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}