'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HFAApi } from '../../lib/api';
import RouteGuard from '../../components/RouteGuard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function MentorshipHubContent() {
  const { user } = useAuth();
  const router = useRouter();
  
  // State for mentors
  const [mentors, setMentors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState('all');
  
  // State for sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Booking modal state
  const [selectedMentor, setSelectedMentor] = useState<any | null>(null);
  const [bookingFormData, setBookingFormData] = useState({
    title: '',
    agenda: '',
    session_type: 'one_on_one',
    format: 'video',
    scheduled_at: '',
    duration_min: 60,
  });
  
  const [booking, setBooking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const mentorsRes = await HFAApi.loadMentors();
      if (mentorsRes?.success) setMentors(mentorsRes.data);

      const sessionsRes = await HFAApi.loadMySessions();
      if (sessionsRes?.success) setSessions(sessionsRes.data);
    } catch (err) {
      console.error('Failed to load mentorship data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter mentors based on search & expertise
  const filteredMentors = mentors.filter(mentor => {
    const mentorName = `${mentor.first_name || ''} ${mentor.last_name || ''}`.toLowerCase();
    const mentorBio = (mentor.bio || '').toLowerCase();
    const expertiseList = mentor.expertise || [];
    
    const matchesSearch = 
      mentorName.includes(searchQuery.toLowerCase()) || 
      mentorBio.includes(searchQuery.toLowerCase()) ||
      expertiseList.some((e: string) => e.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesExpertise = 
      selectedExpertise === 'all' || 
      expertiseList.some((e: string) => e.toLowerCase() === selectedExpertise.toLowerCase());
      
    return matchesSearch && matchesExpertise;
  });

  // Extract all unique expertise tags from fetched mentors
  const allExpertiseTags = Array.from(
    new Set(mentors.flatMap(m => m.expertise || []))
  );

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;
    
    setBooking(true);
    setSuccessMessage(null);
    
    try {
      const payload = {
        mentor_id: selectedMentor.id,
        ...bookingFormData,
      };
      
      const res = await HFAApi.bookSession(payload);
      if (res?.success) {
        setSuccessMessage('Mentorship session scheduled successfully!');
        setBookingFormData({
          title: '',
          agenda: '',
          session_type: 'one_on_one',
          format: 'video',
          scheduled_at: '',
          duration_min: 60,
        });
        setSelectedMentor(null);
        await fetchData(); // refresh list
      }
    } catch (err: any) {
      alert(err.message || 'Failed to schedule session.');
    } finally {
      setBooking(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      const res = await HFAApi.updateSessionStatus(sessionId, 'live');
      if (res?.success) {
        router.push(`/mentorship/room/${sessionId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start session room.');
    }
  };

  // Categorize user sessions
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' || s.status === 'live');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }} className="fade-in">
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/dashboard" style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'Outfit' }}>
            Hope<span style={{ color: 'var(--brand-green)' }}>Fusion</span>
          </Link>
          <span className="badge badge-green">Mentorship Hub</span>
        </div>
        <Link href="/dashboard" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Back to Dashboard
        </Link>
      </header>

      {/* Main Grid Workspace */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 2rem' }}>
        
        {/* Banner Card */}
        <div className="glass-panel glow-green" style={{ padding: '32px', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', fontFamily: 'Outfit' }}>
            Accelerate with Expert Mentors
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px' }}>
            Connect with West Africa’s top industry leaders, agricultural economists, and tech pioneers. Schedule real-time live consultations with unified WebRTC call rooms.
          </p>
        </div>

        {successMessage && (
          <div style={{
            backgroundColor: 'rgba(45, 181, 98, 0.1)',
            border: '1px solid rgba(45, 181, 98, 0.2)',
            color: 'var(--brand-green)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '24px'
          }}>
            {successMessage}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: '32px', alignItems: 'start' }} className="mentorship-layout-grid">
          
          {/* LEFT: Discover Mentors */}
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', fontFamily: 'Outfit' }}>Discover Mentors</h2>
            
            {/* Search/Filter Controls */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by name, biography, or tags..."
                className="form-input"
                style={{ flex: 1, minWidth: '200px', padding: '10px 16px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="form-input"
                style={{ width: '180px', padding: '10px', color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                value={selectedExpertise}
                onChange={(e) => setSelectedExpertise(e.target.value)}
              >
                <option value="all">All Expertise</option>
                {allExpertiseTags.map((tag: any) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
                <div className="spinner" />
              </div>
            ) : filteredMentors.length === 0 ? (
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>No mentors found matching your filters.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                {filteredMentors.map((mentor) => (
                  <div key={mentor.id} className="glass-panel glass-panel-hover" style={{ padding: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <img
                      src={mentor.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80'}
                      alt={`${mentor.first_name} ${mentor.last_name}`}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                    />
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', marginBottom: '2px', fontFamily: 'Outfit' }}>
                            {mentor.first_name} {mentor.last_name}
                          </h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--brand-green)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                            {mentor.industries?.join(' & ') || 'Ecosystem Advisor'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--brand-amber)', fontSize: '0.9rem', fontWeight: 700 }}>
                            ★ {Number(mentor.avg_rating || 5.0).toFixed(2)}
                          </span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({mentor.rating_count || 0} reviews)</p>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                        {mentor.bio || mentor.bio_extended || 'No bio details provided.'}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        {/* Expertise Tags */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {mentor.expertise?.map((exp: string) => (
                            <span key={exp} className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                              {exp}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => setSelectedMentor(mentor)}
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                        >
                          Book Session
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Scheduled Sessions */}
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', fontFamily: 'Outfit' }}>My Sessions</h2>
            
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                <div className="spinner" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '0.85rem' }}>No sessions booked yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="glass-panel" style={{ padding: '20px', borderLeft: session.status === 'live' ? '4px solid var(--brand-green)' : '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className={`badge ${session.status === 'live' ? 'badge-green glow-green' : 'badge-amber'}`} style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {session.status === 'live' ? '🔴 Live Now' : 'Scheduled'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(session.scheduled_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', marginBottom: '4px', fontFamily: 'Outfit' }}>{session.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Mentor: <strong>{session.mentor_first_name} {session.mentor_last_name}</strong>
                    </p>

                    {session.agenda && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontStyle: 'italic' }}>
                        "{session.agenda}"
                      </p>
                    )}

                    {session.status === 'live' ? (
                      <Link
                        href={`/mentorship/room/${session.id}`}
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: '0.8rem', animation: 'pulse 2s infinite' }}
                      >
                        Join Call Room
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleStartSession(session.id)}
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: '0.8rem' }}
                      >
                        Enter Session Room
                      </button>
                    )}
                  </div>
                ))}

                {pastSessions.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Past Sessions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {pastSessions.map((session) => (
                        <div key={session.id} className="glass-panel" style={{ padding: '14px 18px', opacity: 0.7 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{session.title}</span>
                            <span className="badge" style={{ fontSize: '0.65rem' }}>{session.status}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {session.mentor_first_name} {session.mentor_last_name} · {new Date(session.scheduled_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Glassmorphic Booking Modal */}
        {selectedMentor && (
          <div className="modal-backdrop" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '20px'
          }}>
            <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '32px', position: 'relative' }}>
              <button
                onClick={() => setSelectedMentor(null)}
                style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
              
              <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', fontFamily: 'Outfit' }}>
                Book Consultation
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                Scheduling session with <strong>{selectedMentor.first_name} {selectedMentor.last_name}</strong>
              </p>

              <form onSubmit={handleBookSession}>
                <div className="form-group">
                  <label className="form-label">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Funding Strategy Review"
                    className="form-input"
                    value={bookingFormData.title}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Session Agenda</label>
                  <textarea
                    placeholder="Provide context or specific questions for the mentor..."
                    className="form-input"
                    rows={3}
                    value={bookingFormData.agenda}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, agenda: e.target.value })}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Session Format</label>
                    <select
                      className="form-input"
                      value={bookingFormData.format}
                      onChange={(e) => setBookingFormData({ ...bookingFormData, format: e.target.value })}
                      style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <option value="video">Video Call</option>
                      <option value="phone">Voice Call</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <select
                      className="form-input"
                      value={bookingFormData.duration_min}
                      onChange={(e) => setBookingFormData({ ...bookingFormData, duration_min: parseInt(e.target.value) })}
                      style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <option value="30">30 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Schedule Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={bookingFormData.scheduled_at}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, scheduled_at: e.target.value })}
                    style={{ color: 'white', backgroundColor: 'var(--bg-secondary)' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={booking}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
                >
                  {booking ? 'Scheduling...' : 'Schedule Booking'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      <style jsx global>{`
        @media(max-width: 900px) {
          .mentorship-layout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function MentorshipHubPage() {
  return (
    <RouteGuard allowedRoles={['startup']}>
      <MentorshipHubContent />
    </RouteGuard>
  );
}
