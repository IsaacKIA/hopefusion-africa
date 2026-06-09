'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { HFAApi } from '../../../../lib/api';
import RouteGuard from '../../../../components/RouteGuard';
import { useParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Link from 'next/link';

interface Message {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: string;
}

interface Reaction {
  id: number;
  emoji: string;
  left: number;
}

function MeetingRoomContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time states
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [peerHandRaised, setPeerHandRaised] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  
  // Call Controls
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [participantsCount, setParticipantsCount] = useState(1);
  const [activeTab, setActiveTab] = useState<'chat' | 'controls'>('chat');

  const socketRef = useRef<any>(null);
  const durationTimerRef = useRef<any>(null);
  const reactionIdRef = useRef(0);

  const isMentor = user?.role === 'mentor';
  const peerName = isMentor
    ? `${session?.mentee_first_name || 'Startup'} ${session?.mentee_last_name || 'Founder'}`
    : `Dr. ${session?.mentor_last_name || 'Mentor'}`;
  
  const peerAvatar = isMentor
    ? session?.mentee_avatar_url || 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80'
    : session?.mentor_avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80';

  // Fetch session details on mount
  useEffect(() => {
    const loadSessionDetails = async () => {
      try {
        const res = await HFAApi.loadMySessions();
        if (res?.success) {
          const matched = res.data.find((s: any) => s.id === sessionId);
          if (matched) {
            setSession(matched);
            // If session already finished, send back
            if (matched.status === 'completed' || matched.status === 'cancelled') {
              alert('This session has already ended.');
              router.replace(isMentor ? '/mentor' : '/mentorship');
            }
          } else {
            alert('Session not found.');
            router.replace('/');
          }
        }
      } catch (err) {
        console.error('Failed to load session details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSessionDetails();
  }, [sessionId]);

  // Connect to Socket.io signaling server
  useEffect(() => {
    if (!session || !user) return;

    const token = localStorage.getItem('hfa_token');
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    
    // Connect with authorization token
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Room Socket] Connected to server signaling room');
      // Join the live stream session room
      socket.emit('live:join', { session_id: sessionId }, (res: any) => {
        if (res?.success) {
          setParticipantsCount(res.participant_count || 1);
        }
      });
    });

    // Handle peer connections / online presence
    socket.on('live:participant_joined', (data: any) => {
      setParticipantsCount(data.count || 2);
      setPeerOnline(true);
      setMessages(prev => [
        ...prev,
        {
          id: `join-${Date.now()}`,
          sender: 'System',
          role: 'system',
          text: `${data.name} entered the room.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    });

    socket.on('live:participant_left', (data: any) => {
      setParticipantsCount(data.count || 1);
      setPeerOnline(false);
      setMessages(prev => [
        ...prev,
        {
          id: `leave-${Date.now()}`,
          sender: 'System',
          role: 'system',
          text: `${data.name} left the room.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    });

    // Handle Q&A Questions
    socket.on('live:question', (data: any) => {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-${Math.random()}`,
          sender: data.name,
          role: data.role,
          text: data.question,
          time: new Date(data.asked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    });

    // Handle Floating Emoji Reactions
    socket.on('live:reaction', (data: any) => {
      triggerReactionParticle(data.emoji);
    });

    // Handle Presenter Hand Raising
    socket.on('live:hand_raised', (data: any) => {
      setPeerHandRaised(true);
      setTimeout(() => setPeerHandRaised(false), 5000); // clear after 5s
      setMessages(prev => [
        ...prev,
        {
          id: `hand-${Date.now()}`,
          sender: 'System',
          role: 'system',
          text: `${data.name} raised their hand ✋`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    });

    // Start Call duration timer
    durationTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(durationTimerRef.current);
      if (socketRef.current) {
        socketRef.current.emit('live:leave', { session_id: sessionId });
        socketRef.current.disconnect();
      }
    };
  }, [session]);

  const triggerReactionParticle = (emoji: string) => {
    const id = reactionIdRef.current++;
    const randomLeft = Math.floor(Math.random() * 80) + 10; // 10% to 90% width
    
    setReactions(prev => [...prev, { id, emoji, left: randomLeft }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2500); // cleanup after animation completes
  };

  const handleSendReaction = (emoji: string) => {
    triggerReactionParticle(emoji);
    if (socketRef.current) {
      socketRef.current.emit('live:reaction', { session_id: sessionId, emoji });
    }
  };

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    if (socketRef.current) {
      socketRef.current.emit('live:question', {
        session_id: sessionId,
        question: inputText.trim(),
      });
    }
    
    // Add locally immediately (optional, socket broadcast handles relaying back)
    setMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: `${user?.first_name} ${user?.last_name}`,
        role: user?.role || 'startup',
        text: inputText.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
    
    setInputText('');
  };

  const handleToggleHandRaise = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    if (nextState && socketRef.current) {
      socketRef.current.emit('live:raise_hand', { session_id: sessionId });
    }
  };

  const handleEndSession = async () => {
    const confirmMsg = isMentor
      ? 'Ending this consultation will mark it as complete. Would you like to proceed?'
      : 'Are you sure you want to exit the session room?';
      
    if (!confirm(confirmMsg)) return;

    try {
      // Mentor finishes the meeting session completely
      if (isMentor) {
        await HFAApi.updateSessionStatus(sessionId, 'completed', `Session completed successfully. Duration: ${Math.ceil(callDuration / 60)} minutes.`);
      }
      
      router.push(isMentor ? '/mentor' : '/mentorship');
    } catch (err: any) {
      alert(err.message || 'Error ending session.');
      router.push(isMentor ? '/mentor' : '/mentorship');
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div style={{ color: '#64748b', padding: '60px', textAlign: 'center', backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>Loading Live Consult Screen…</div>;
  if (!session) return null;

  return (
    <div style={{
      height: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }} className="room-layout">
      
      {/* HUD HEADER */}
      <header style={{
        padding: '12px 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(18, 18, 18, 0.7)', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(10px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit' }}>
            Hope<span style={{ color: 'var(--brand-green)' }}>Fusion</span> Live Room
          </span>
          <span className="badge badge-green" style={{ animation: 'pulse 1.5s infinite', textTransform: 'uppercase', fontSize: '0.7rem' }}>
            🔴 Connection Live
          </span>
        </div>
        
        {/* TIMER & COMPATIBILITY STATS */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', padding: '6px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', letterSpacing: '0.05em' }}>Duration</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Outfit' }}>{formatTimer(callDuration)}</span>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', padding: '6px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', letterSpacing: '0.05em' }}>Room Size</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-green)' }}>{participantsCount} online</span>
          </div>
        </div>

        <div>
          <button onClick={handleEndSession} className="btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444', padding: '6px 16px', fontSize: '0.8rem' }}>
            {isMentor ? 'Complete Session' : 'Exit Room'}
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE: Stream Panels & Collapsible Sidebar */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        {/* Presenter Hand Raise HUD Indicator */}
        {peerHandRaised && (
          <div className="hand-raise-alert" style={{
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(232, 160, 32, 0.95)', color: '#050300', padding: '12px 24px',
            borderRadius: '12px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 8px 32px rgba(232, 160, 32, 0.4)', animation: 'slideDown 0.3s ease',
            fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.9rem'
          }}>
            ✋ {peerName} has raised their hand!
          </div>
        )}

        {/* Dynamic Reaction Particles Overlay */}
        <div style={{ position: 'absolute', bottom: '100px', left: 0, right: '350px', height: '80%', pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
          {reactions.map(react => (
            <span
              key={react.id}
              className="floating-emoji"
              style={{
                position: 'absolute',
                left: `${react.left}%`,
                bottom: 0,
                fontSize: '2.5rem',
                opacity: 0,
                animation: 'floatUp 2.5s cubic-bezier(0.08, 0.8, 0.1, 1) forwards'
              }}
            >
              {react.emoji}
            </span>
          ))}
        </div>

        {/* LEFT VIEWPORT: Dynamic Video Feeds Grid */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', background: '#080808' }}>
          
          {/* Main Remote Peer Canvas Area */}
          <div className="glass-panel" style={{
            width: '100%', height: '100%', borderRadius: '24px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
            background: cameraActive && peerOnline ? 'linear-gradient(135deg, #131d16 0%, #0d121c 100%)' : '#111'
          }}>
            
            {/* Remote Peer Info Indicator */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '20px', zIndex: 2 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: peerOnline ? 'var(--brand-green)' : '#ef4444' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{peerName}</span>
            </div>

            {peerOnline ? (
              <div style={{ textAlign: 'center', zIndex: 1 }}>
                <img
                  src={peerAvatar}
                  alt={peerName}
                  style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--border-color)', objectFit: 'cover', marginBottom: '16px', boxShadow: '0 0 40px rgba(255,255,255,0.05)' }}
                />
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit' }}>{peerName}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                  {isMentor ? 'Startup Founder' : 'West Africa Mentor & Advisor'}
                </p>

                {/* Animated Pulsing Audio Visualizer Ring */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '24px', height: '30px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((bar, i) => (
                    <div
                      key={i}
                      style={{
                        width: '4px',
                        background: 'var(--brand-green)',
                        borderRadius: '2px',
                        height: `${bar * 6}px`,
                        animation: 'bounceWave 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔌</div>
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit' }}>Waiting for {peerName} to connect</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  They will join this call room shortly. Please stay online.
                </p>
              </div>
            )}

            {/* Simulated Presenter Screen Share Layer */}
            {screenSharing && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(5, 20, 10, 0.95)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 4
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🖥️</div>
                <h3 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', color: 'var(--brand-green)' }}>You are presenting your screen</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '320px', textAlign: 'center' }}>
                  Broadcasting local telemetry and materials to the remote consultant.
                </p>
                <button
                  onClick={() => setScreenSharing(false)}
                  className="btn-secondary"
                  style={{ marginTop: '20px', borderColor: 'var(--brand-green)', color: 'var(--brand-green)' }}
                >
                  Stop Screen Share
                </button>
              </div>
            )}
          </div>

          {/* Picture-in-Picture Local User Glassmorphic Preview */}
          <div className="glass-panel" style={{
            position: 'absolute', bottom: '50px', right: '50px', width: '150px', height: '110px',
            borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(18, 18, 18, 0.9)', zIndex: 6, boxShadow: 'var(--shadow-lg)'
          }}>
            {cameraActive ? (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={user?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80'}
                  alt="You"
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  You (Camera Active)
                </span>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                <span>📷 Video Off</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLLAPSIBLE SIDEBAR PANEL: Messages & Interactive HUD */}
        <aside style={{
          width: '350px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column',
          background: 'var(--bg-secondary)', zIndex: 8
        }}>
          
          {/* TAB BAR NAVIGATION */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1, padding: '16px', background: activeTab === 'chat' ? 'rgba(255,255,255,0.03)' : 'transparent',
                color: activeTab === 'chat' ? 'var(--brand-green)' : 'var(--text-secondary)', fontWeight: 600,
                borderBottom: activeTab === 'chat' ? '2px solid var(--brand-green)' : 'none', cursor: 'pointer'
              }}
            >
              Q&A Workshop
            </button>
            <button
              onClick={() => setActiveTab('controls')}
              style={{
                flex: 1, padding: '16px', background: activeTab === 'controls' ? 'rgba(255,255,255,0.03)' : 'transparent',
                color: activeTab === 'controls' ? 'var(--brand-green)' : 'var(--text-secondary)', fontWeight: 600,
                borderBottom: activeTab === 'controls' ? '2px solid var(--brand-green)' : 'none', cursor: 'pointer'
              }}
            >
              Auditor Controls
            </button>
          </div>

          {/* TAB 1 CONTENT: Q&A Live Feeds */}
          {activeTab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <p>No questions asked yet.</p>
                    <p style={{ marginTop: '4px' }}>Use the box below to ask questions or exchange notes during this session.</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} style={{
                      alignSelf: msg.role === 'system' ? 'center' : 'flex-start',
                      background: msg.role === 'system' ? 'transparent' : 'rgba(255,255,255,0.03)',
                      padding: msg.role === 'system' ? '4px 12px' : '10px 14px',
                      borderRadius: '12px', maxWidth: '90%',
                      border: msg.role === 'system' ? 'none' : '1px solid var(--border-color)'
                    }}>
                      {msg.role !== 'system' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: msg.role === 'mentor' ? 'var(--brand-amber)' : 'var(--brand-green)' }}>
                            {msg.sender}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{msg.time}</span>
                        </div>
                      )}
                      <p style={{ fontSize: '0.8rem', color: msg.role === 'system' ? 'var(--text-muted)' : 'var(--text-primary)', textAlign: msg.role === 'system' ? 'center' : 'left' }}>
                        {msg.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendQuestion} style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Ask a question..."
                  className="form-input"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                  Send
                </button>
              </form>
            </div>
          )}

          {/* TAB 2 CONTENT: Call Controls HUD */}
          {activeTab === 'controls' && (
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Interaction Toolkit
                </h4>
                
                {/* FLOATING EMOJI TRIGGER GROUP */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Broadcast live reactions</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['🎉', '🔥', '👏', '🚀'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleSendReaction(emoji)}
                        style={{
                          flex: 1, padding: '10px 0', fontSize: '1.4rem', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer',
                          transition: 'transform 0.1s'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HAND RAISE TOGGLE */}
                <button
                  onClick={handleToggleHandRaise}
                  className={`btn-${handRaised ? 'primary' : 'secondary'}`}
                  style={{
                    width: '100%', justifyContent: 'center', marginTop: '16px', padding: '10px',
                    borderColor: handRaised ? 'transparent' : 'var(--brand-amber)',
                    color: handRaised ? '#050300' : 'var(--brand-amber)',
                    background: handRaised ? 'var(--brand-amber)' : 'transparent'
                  }}
                >
                  {handRaised ? '✋ Lower Hand' : '✋ Raise Hand'}
                </button>
              </div>

              {/* Hardware Device Toggles */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Hardware Toggles
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => setMicActive(!micActive)}
                    className="btn-secondary"
                    style={{
                      justifyContent: 'space-between', padding: '10px 14px', width: '100%', fontSize: '0.8rem',
                      borderColor: micActive ? 'rgba(255,255,255,0.1)' : '#ef4444',
                      color: micActive ? 'white' : '#ef4444'
                    }}
                  >
                    <span>🎙️ Microphone</span>
                    <span>{micActive ? 'Active' : 'Muted'}</span>
                  </button>

                  <button
                    onClick={() => setCameraActive(!cameraActive)}
                    className="btn-secondary"
                    style={{
                      justifyContent: 'space-between', padding: '10px 14px', width: '100%', fontSize: '0.8rem',
                      borderColor: cameraActive ? 'rgba(255,255,255,0.1)' : '#ef4444',
                      color: cameraActive ? 'white' : '#ef4444'
                    }}
                  >
                    <span>📷 Camera Feed</span>
                    <span>{cameraActive ? 'Active' : 'Disabled'}</span>
                  </button>

                  <button
                    onClick={() => setScreenSharing(!screenSharing)}
                    className="btn-secondary"
                    style={{
                      justifyContent: 'space-between', padding: '10px 14px', width: '100%', fontSize: '0.8rem',
                      borderColor: screenSharing ? 'var(--brand-green)' : 'rgba(255,255,255,0.1)',
                      color: screenSharing ? 'var(--brand-green)' : 'white'
                    }}
                  >
                    <span>🖥️ Screen Share</span>
                    <span>{screenSharing ? 'Sharing' : 'Off'}</span>
                  </button>
                </div>
              </div>

              {/* Tips Section */}
              <div style={{ marginTop: 'auto', background: 'rgba(45, 181, 98, 0.05)', border: '1px solid rgba(45,181,98,0.1)', padding: '14px', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-green)', display: 'block', marginBottom: '4px' }}>💡 Pro Tip</span>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Ensure your Web VAPID and Firebase Push configurations are enabled to trigger instant SMS and device push alerts if either participant leaves or declines call invites.
                </p>
              </div>

            </div>
          )}
        </aside>

      </div>

      {/* Global Embedded CSS Animations */}
      <style jsx global>{`
        @keyframes bounceWave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(2.2); }
        }
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.5);
          }
          10% {
            opacity: 1;
            transform: translateY(-50px) scale(1.1);
          }
          90% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: translateY(-400px) scale(0.8) rotate(${Math.random() > 0.5 ? '25deg' : '-25deg'});
          }
        }
        @keyframes slideDown {
          from { transform: translate(-50%, -100px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function MeetingRoomPage() {
  return (
    <RouteGuard>
      <MeetingRoomContent />
    </RouteGuard>
  );
}
