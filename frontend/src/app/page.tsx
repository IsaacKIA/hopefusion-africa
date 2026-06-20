'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, logout } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [counters, setCounters] = useState({ startups: 0, funding: 0, jobs: 0, market: 0 });

  // Live ticker updating states
  const [liveCount, setLiveCount] = useState(4872);
  const [liveCollab, setLiveCollab] = useState(87);

  // Counter animations on load
  useEffect(() => {
    const duration = 2000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setCounters({
        startups: Math.round(progress * 5000),
        funding: Math.round(progress * 50),
        jobs: Math.round(progress * 10),
        market: Math.round(progress * 3),
      });
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    // Live Ticker updates
    const tickerInterval = setInterval(() => {
      if (Math.random() > 0.5) {
        setLiveCount(prev => prev + Math.floor(Math.random() * 3));
      }
      if (Math.random() > 0.75) {
        setLiveCollab(prev => prev + 1);
      }
    }, 4000);

    return () => clearInterval(tickerInterval);
  }, []);

  const steps = [
    {
      title: 'Register your startup',
      body: 'Build your startup profile with pitch details, team info, sector, and funding needs. Our platform sanitizes variables and registers you securely.',
      icon: '🚀'
    },
    {
      title: 'Get matched by AI',
      body: 'Our proactive matching engine parses data graphs using deep similarity coefficients to pair you with matching angels, impact VCs, or mentors.',
      icon: '🤖'
    },
    {
      title: 'Access funding & escrow',
      body: 'Apply for grants, access milestone-based escrow contracts, and settle investments natively with African gateways like Paystack or MTN MoMo.',
      icon: '🏆'
    },
    {
      title: 'Scale and thrive',
      body: 'Leverage our integrated PWA client support, localized learning pathways, and B2B marketplace to expand beyond geographic borders.',
      icon: '📈'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }} className="fade-in">
      {/* ===== HEADER NAVIGATION ===== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-color)', height: '70px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2.5rem'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg style={{ width: '36px', height: '36px' }} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 28 Q5 18 11 10" stroke="var(--brand-green)" strokeWidth="3" strokeLinecap="round"/>
            <path d="M13 30 Q9 19 16 11" stroke="var(--brand-amber)" strokeWidth="3" strokeLinecap="round"/>
            <path d="M18 31 Q14 20 21 12" stroke="var(--brand-green)" strokeWidth="3" strokeLinecap="round"/>
            <path d="M23 30 Q19 19 25 12" stroke="var(--brand-amber)" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="21" cy="8" r="2.5" fill="#EF4444"/>
            <circle cx="26" cy="13" r="2.5" fill="#EF4444"/>
          </svg>
          <div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700 }}>
              <span style={{ color: 'var(--brand-green)' }}>Hope</span>Fusion
            </span>
            <span style={{ display: 'block', fontSize: '10px', letterSpacing: '0.22em', marginTop: '-4px', color: 'var(--brand-amber)' }}>AFRICA</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }} className="desktop-links">
          <a href="#how" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>How it works</a>
          <a href="#platform" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Platform</a>
          <a href="#impact" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Impact</a>
          <a href="#sdgs" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>SDGs</a>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user ? (
            <>
              <Link href="/dashboard" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Dashboard
              </Link>
              <button onClick={logout} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Sign In
              </Link>
              <Link href="/register" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', position: 'relative',
        padding: '140px 2rem 0px', textAlign: 'center', zIndex: 1
      }}>
        {/* Glowing Orbs */}
        <div className="orb orb-1" style={{ position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', background: 'rgba(45, 181, 98, 0.12)', borderRadius: '50%', filter: 'blur(100px)' }} />
        <div className="orb orb-2" style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '400px', height: '400px', background: 'rgba(232, 160, 32, 0.08)', borderRadius: '50%', filter: 'blur(100px)' }} />

        <div className="glass-panel glow-green" style={{
          padding: '8px 20px', borderRadius: '100px', display: 'inline-flex',
          alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.85rem'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-green)' }} />
          Beta Launch — 5,000+ Startups Active
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', maxWidth: '900px', marginBottom: '24px' }}>
          Where African <span className="gradient-text-green">Innovation</span> <br />
          Meets <span className="gradient-text-amber">Opportunity</span>
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', maxWidth: '600px', marginBottom: '40px' }}>
          One unified platform connecting startups, investors, mentors, and resources across the continent. Empower. Innovate. Thrive.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '60px' }}>
          <Link href="/register" className="btn-primary" style={{ padding: '16px 36px', fontSize: '1rem' }}>
            Launch Your Startup
          </Link>
          <a href="#how" className="btn-secondary" style={{ padding: '16px 36px', fontSize: '1rem' }}>
            Learn More
          </a>
        </div>

        {/* Live Ticker Bar */}
        <div style={{
          width: '100vw', background: 'rgba(45, 181, 98, 0.04)',
          borderTop: '1px solid rgba(45, 181, 98, 0.15)',
          borderBottom: '1px solid rgba(45, 181, 98, 0.15)',
          padding: '12px 0', overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap',
            fontSize: '0.85rem', color: 'var(--text-secondary)'
          }}>
            <span>🌱 Startups: <strong style={{ color: 'var(--brand-green)' }}>{liveCount.toLocaleString()}</strong></span>
            <span>🤝 Collaborations: <strong style={{ color: 'var(--brand-green)' }}>{liveCollab}</strong></span>
            <span>🌍 Active Countries: <strong style={{ color: 'var(--brand-amber)' }}>14</strong></span>
            <span>💼 Market Size Opportunity: <strong style={{ color: 'var(--brand-green)' }}>$3 Trillion</strong></span>
          </div>
        </div>

        {/* Hero Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          width: '100%', maxWidth: '1100px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ padding: '36px 24px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--text-primary)' }}>{counters.startups}+</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>STARTUPS IN BETA</p>
          </div>
          <div style={{ padding: '36px 24px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--brand-amber)' }}>${counters.funding}M</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>IMPACT FUNDING GOAL</p>
          </div>
          <div style={{ padding: '36px 24px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--brand-green)' }}>{counters.jobs}%</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>UNEMPLOYMENT REDUCTION BY 2030</p>
          </div>
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--brand-amber)' }}>${counters.market}T</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>AFRICAN MARKET OPPORTUNITY</p>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" style={{ padding: '100px 2.5rem', background: '#0e0e0e' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <span className="badge badge-green" style={{ marginBottom: '16px' }}>How it works</span>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>From idea to impact in four steps</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '48px' }}>
            A structured path designed to address actual pain points and market opportunities across African hubs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {steps.map((step, idx) => (
              <div 
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`glass-panel glass-panel-hover ${activeStep === idx ? 'glow-green' : ''}`}
                style={{
                  padding: '32px 24px', cursor: 'pointer',
                  borderColor: activeStep === idx ? 'var(--brand-green)' : 'var(--border-color)',
                  background: activeStep === idx ? 'rgba(45, 181, 98, 0.03)' : 'var(--bg-card)'
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '8px',
                  backgroundColor: activeStep === idx ? 'var(--brand-green)' : 'var(--bg-secondary)',
                  color: activeStep === idx ? '#000' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, marginBottom: '20px', transition: 'all 0.2s'
                }}>
                  0{idx + 1}
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.body.substring(0, 85)}...</p>
              </div>
            ))}
          </div>

          <div className="glass-panel" style={{ display: 'flex', gap: '24px', padding: '36px', marginTop: '32px', alignItems: 'center' }}>
            <span style={{ fontSize: '3rem' }}>{steps[activeStep].icon}</span>
            <div>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{steps[activeStep].title}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{steps[activeStep].body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLATFORM MODULES ===== */}
      <section id="platform" style={{ padding: '100px 2.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <span className="badge badge-amber" style={{ marginBottom: '16px' }}>Modules</span>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '48px' }}>Ecosystem layers built for growth</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="glass-panel glass-panel-hover" style={{ padding: '36px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(45, 181, 98, 0.1)', color: 'var(--brand-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>
                🏆
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Grant Platform</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Curated grant applications aligned with development goals, verifying eligibility parameters.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '36px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(232, 160, 32, 0.1)', color: 'var(--brand-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>
                🤖
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>AI Matchmaking</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Connect startup vectors to institutional investors, angels, and capital advisors proactively.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '36px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>
                🛒
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>AI E-Commerce</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Launch B2B startup listings with mobile money checkouts and unified logistics routing.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '36px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>
                ⚙️
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Process Automation</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Automate compliance checks, tax regulations, reporting pipelines, and back-office overhead.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '36px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(45, 181, 98, 0.1)', color: 'var(--brand-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>
                🎓
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>E-Learning & Mentors</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Earn ecosystem XP from tailored business courses and schedule live session bookings.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '36px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(232, 160, 32, 0.1)', color: 'var(--brand-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px' }}>
                🏛️
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Policy Advocacy</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Navigate regulatory frameworks, regional registries, and explore public startup acts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== POTENTIAL IMPACT ===== */}
      <section id="impact" style={{ padding: '100px 2.5rem', background: '#0e0e0e', position: 'relative' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <span className="badge badge-green" style={{ marginBottom: '16px' }}>Ecosystem Impact</span>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '48px' }}>Built to change Africa's future</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ fontSize: '1.75rem', color: 'var(--brand-green)', marginBottom: '12px' }}>📈</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Economic Growth</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Accelerating GDP performance across 54 African nations through tech-driven enterprise scaling.
              </p>
            </div>
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ fontSize: '1.75rem', color: 'var(--brand-amber)', marginBottom: '12px' }}>👥</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Job Creation</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Targeting local hire expansions to lower youth unemployment counts significantly.
              </p>
            </div>
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ fontSize: '1.75rem', color: '#EF4444', marginBottom: '12px' }}>🌍</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Global Market</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Opening direct corridors to cross-border investors and international strategic corporate partners.
              </p>
            </div>
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ fontSize: '1.75rem', color: '#A78BFA', marginBottom: '12px' }}>⚖️</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Equality Access</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Democratizing funding tools, resources, and mentorship irrespective of gender or geography.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== UN SDGs ALIGNMENT ===== */}
      <section id="sdgs" style={{ padding: '100px 2.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <span className="badge badge-amber" style={{ marginBottom: '16px' }}>UN SDGs</span>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Aligned with global targets</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', marginBottom: '40px' }}>
            HopeFusion Africa directly maps to 9 of the 17 UN Sustainable Development Goals, validating developer and allocator trust.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <span className="badge badge-red" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 1: No Poverty</span>
            <span className="badge badge-amber" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 3: Good Health & Well-Being</span>
            <span className="badge badge-red" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 4: Quality Education</span>
            <span className="badge badge-green" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 6: Clean Water & Sanitation</span>
            <span className="badge badge-red" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 8: Decent Work & Economic Growth</span>
            <span className="badge badge-amber" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 9: Industry, Innovation & Infrastructure</span>
            <span className="badge badge-red" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 10: Reduced Inequality</span>
            <span className="badge badge-green" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 13: Climate Action</span>
            <span className="badge badge-green" style={{ padding: '12px 18px', borderRadius: '10px' }}>SDG 17: Partnerships for the Goals</span>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section style={{ padding: '100px 2.5rem', background: '#0e0e0e' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <span className="badge badge-green" style={{ marginBottom: '16px' }}>Feedback</span>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '48px' }}>What our community says</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ color: 'var(--brand-amber)', marginBottom: '16px' }}>★★★★★</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '24px', lineHeight: 1.7 }}>
                "HopeFusion connected us with three investors in our first week. No other platform in Africa gives startups this level of structured access to capital."
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--brand-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                  AK
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem' }}>Ama Korantema</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Founder, GreenTech Ghana</p>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ color: 'var(--brand-amber)', marginBottom: '16px' }}>★★★★★</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '24px', lineHeight: 1.7 }}>
                "As an impact investor, finding African startups aligned with my thesis was nearly impossible — until HopeFusion. The AI matching is genuinely remarkable."
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--brand-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                  RM
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem' }}>Rene Moerman</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seasoned Angel Advisor</p>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ color: 'var(--brand-amber)', marginBottom: '16px' }}>★★★★★</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '24px', lineHeight: 1.7 }}>
                "The e-learning and mentorship modules gave my team skills we could not have accessed otherwise. This is what Africa's startup generation has been waiting for."
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                  FY
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem' }}>Faustina Esi Yankson</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Agripreneur, Ghana</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section style={{
        background: 'linear-gradient(135deg, var(--brand-green-hover) 0%, var(--brand-green) 100%)',
        padding: '96px 2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', color: '#000', marginBottom: '16px' }}>
            Ready to shape Africa's economic story?
          </h2>
          <p style={{ color: 'rgba(0,0,0,0.7)', fontSize: '1.1rem', marginBottom: '36px' }}>
            Join thousands of founders, investors, and mentors building scalable projects cross-continentally.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/register?role=startup" className="btn-secondary" style={{ backgroundColor: '#000', color: '#fff', borderColor: 'transparent', padding: '14px 28px' }}>
              Launch My Startup →
            </Link>
            <Link href="/register?role=investor" className="btn-secondary" style={{ backgroundColor: 'transparent', color: '#000', borderColor: 'rgba(0,0,0,0.3)', padding: '14px 28px' }}>
              Join as Capital Allocator
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FULL FOOTER ===== */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '80px 2.5rem 40px',
        backgroundColor: '#050505'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '40px',
            marginBottom: '60px'
          }}>
            <div>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 800 }}>
                  <span style={{ color: 'var(--brand-green)' }}>Hope</span>Fusion
                </span>
              </Link>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Africa's first integrated startup ecosystem marketplace. Empowering entrepreneurs to innovate, collaborate, and scale.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <li><Link href="/grants">Grant Center</Link></li>
                <li><Link href="/matching">AI Matchmaking</Link></li>
                <li><Link href="/elearning">E-Learning Hub</Link></li>
                <li><Link href="/marketplace">B2B Marketplace</Link></li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <li><a href="#how">How it Works</a></li>
                <li><a href="#impact">Impact Report</a></li>
                <li><a href="#sdgs">SDG Alignment</a></li>
              </ul>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <span>&copy; 2026 HopeFusion Africa. Empower. Innovate. Thrive. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
}
