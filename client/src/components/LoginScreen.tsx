import { useState } from 'react';
import { Element } from '../types';

interface LoginScreenProps {
  onJoinPublic: (name: string) => void;
  onJoinPrivate: (name: string, roomCode: string) => void;
  onCreatePrivate: (name: string) => void;
  onSpectate: (name: string) => void;
  error: string;
  isLoading: boolean;
  connectionError?: string;
  isConnecting?: boolean;
}

export function LoginScreen({
  onJoinPublic,
  onJoinPrivate,
  onCreatePrivate,
  onSpectate,
  error,
  isLoading,
  connectionError,
  isConnecting
}: LoginScreenProps) {
  const [currentStep, setCurrentStep] = useState<'mode' | 'name' | 'roomCode'>('mode');
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeError, setRoomCodeError] = useState('');
  const [gameMode, setGameMode] = useState<'public' | 'private' | 'create' | null>(null);

  const sanitizePlayerName = (name: string): string => {
    const trimmed = name.trim().substring(0, 9);
    const cleaned = trimmed.replace(/[<>]/g, '').replace(/[^\p{L}\p{N}\s_\-]/gu, '');
    return cleaned || '';
  };

  const handleModeSelect = (mode: 'public' | 'private' | 'create') => {
    setGameMode(mode);
    if (mode === 'public' || mode === 'create') {
      setCurrentStep('name');
    } else {
      setCurrentStep('roomCode');
    }
  };

  const handleNameSubmit = () => {
    const sanitized = sanitizePlayerName(playerName);
    if (!sanitized) {
      setNameError('Please enter a valid name');
      return;
    }
    setPlayerName(sanitized);
    setNameError('');
    
    // Join room directly after entering name
    if (gameMode === 'create') {
      onCreatePrivate(sanitized);
    } else if (gameMode === 'private' && roomCode) {
      onJoinPrivate(sanitized, roomCode);
    } else if (gameMode === 'public') {
      onJoinPublic(sanitized);
    }
  };

  const handleRoomCodeSubmit = () => {
    const code = roomCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setRoomCodeError('Please enter a valid 6-character room code');
      return;
    }
    setRoomCode(code);
    setRoomCodeError('');
    setCurrentStep('name');
  };

  const handleSpectate = () => {
    if (!playerName) {
      setNameError('Please enter your name first.');
      setCurrentStep('name');
      return;
    }
    const sanitized = sanitizePlayerName(playerName);
    if (!sanitized) {
      setNameError('Please enter a valid name');
      return;
    }
    onSpectate(sanitized);
  };

  return (
    <div id="loginScreen" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #162447 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="login-box">
        {/* Mode Selection Step */}
        <div id="modeStep" className={`login-step ${currentStep === 'mode' ? 'active' : ''}`} style={{
          display: currentStep === 'mode' ? 'block' : 'none'
        }}>
          <h2>Multiplayer Arena</h2>
          <p className="step-subtitle">Choose game mode</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <button
              onClick={() => handleModeSelect('public')}
              disabled={isLoading}
              style={{
                padding: '15px',
                background: 'rgba(78, 205, 196, 0.3)',
                border: '2px solid #4ECDC4',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Find Public Match
            </button>
            <button
              onClick={() => handleModeSelect('create')}
              disabled={isLoading}
              style={{
                padding: '15px',
                background: 'rgba(78, 205, 196, 0.3)',
                border: '2px solid #4ECDC4',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Create Private Room
            </button>
            <button
              onClick={() => handleModeSelect('private')}
              disabled={isLoading}
              style={{
                padding: '15px',
                background: 'rgba(78, 205, 196, 0.3)',
                border: '2px solid #4ECDC4',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Join Private Room
            </button>
          </div>
        </div>

        {/* Room Code Step */}
        <div id="roomCodeStep" className={`login-step ${currentStep === 'roomCode' ? 'active' : ''}`} style={{
          display: currentStep === 'roomCode' ? 'block' : 'none'
        }}>
          <h2>Join Private Room</h2>
          <p className="step-subtitle">Enter room code</p>
          <input
            type="text"
            id="roomCodeInput"
            maxLength={6}
            placeholder="Enter 6-character code"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
              setRoomCodeError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRoomCodeSubmit();
              }
            }}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '24px',
              letterSpacing: '5px',
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
          />
          <div id="roomCodeError" className="error-message">{roomCodeError}</div>
          <div className="step-actions">
            <button
              onClick={() => {
                setCurrentStep('mode');
                setRoomCode('');
                setRoomCodeError('');
              }}
              disabled={isLoading}
            >
              Back
            </button>
            <button
              onClick={handleRoomCodeSubmit}
              disabled={isLoading}
            >
              Continue
            </button>
          </div>
        </div>

        {/* Name Step */}
        <div id="nameStep" className={`login-step ${currentStep === 'name' ? 'active' : ''}`} style={{
          display: currentStep === 'name' ? 'block' : 'none'
        }}>
          <h2>Multiplayer Arena</h2>
          <p className="step-subtitle">Enter your name to begin</p>
          <input
            type="text"
            id="playerNameInput"
            maxLength={9}
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setNameError('');
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNameSubmit();
              }
            }}
          />
          <div id="nameError" className="error-message">{nameError}</div>
          {(error || connectionError) && (
            <div className="error-message" style={{ marginTop: '10px', fontSize: '12px', color: '#ff6b6b' }}>
              {error || connectionError}
            </div>
          )}
          {connectionError && (
            <div className="error-message" style={{ marginTop: '10px', fontSize: '11px', color: '#ffa500' }}>
              💡 Hãy đảm bảo server game đang chạy tại port 8080
            </div>
          )}
          <div className="step-actions">
            <button
              onClick={() => {
                if (roomCode) {
                  setCurrentStep('roomCode');
                } else {
                  setCurrentStep('mode');
                }
                setNameError('');
              }}
              disabled={isLoading}
            >
              Back
            </button>
            <button
              id="continueButton"
              onClick={handleNameSubmit}
              disabled={isLoading || !playerName.trim()}
            >
              {isLoading ? 'Joining...' : gameMode === 'create' ? 'Create Room' : gameMode === 'private' ? 'Join Room' : 'Join Match'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

