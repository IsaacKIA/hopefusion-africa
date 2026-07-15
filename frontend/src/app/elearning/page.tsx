'use client';

import React, { useState, useEffect } from 'react';
import RouteGuard from '../../components/RouteGuard';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

interface Course {
  id: string;
  title: string;
  instructor: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration_hours: number;
  lessons: number;
  progress: number; // 0-100
  xp_reward: number;
  thumbnail_color: string;
  description: string;
  tags: string[];
}

const MOCK_COURSES: Course[] = [
  { id: '1', title: 'Venture Capital & Africa Fundraising', instructor: 'Dr. Amara Diallo', category: 'Finance', level: 'Intermediate', duration_hours: 6, lessons: 18, progress: 65, xp_reward: 350, thumbnail_color: '#2db562', description: 'Deep-dive into African VC landscape, term sheet negotiation, and investor relationship management.', tags: ['vc', 'fundraising', 'africa'] },
  { id: '2', title: 'Product-Led Growth for Startups', instructor: 'Kwame Asante', category: 'Growth', level: 'Advanced', duration_hours: 8, lessons: 24, progress: 20, xp_reward: 500, thumbnail_color: '#e8a020', description: 'Build a PLG motion for B2B SaaS in emerging markets. Covers onboarding, activation, and virality loops.', tags: ['plg', 'saas', 'growth'] },
  { id: '3', title: 'Legal Foundations for Founders', instructor: 'Adaeze Okonkwo', category: 'Legal', level: 'Beginner', duration_hours: 4, lessons: 12, progress: 100, xp_reward: 200, thumbnail_color: '#3b82f6', description: 'Company formation, equity structures, IP protection, and regulatory compliance for African entrepreneurs.', tags: ['legal', 'equity', 'compliance'] },
  { id: '4', title: 'AI & Machine Learning for Business', instructor: 'Seun Adetola', category: 'Technology', level: 'Intermediate', duration_hours: 10, lessons: 28, progress: 0, xp_reward: 600, thumbnail_color: '#8b5cf6', description: 'Practical ML applications for business: demand forecasting, customer churn, sentiment analysis with African datasets.', tags: ['ai', 'ml', 'business'] },
  { id: '5', title: 'Financial Modeling & Valuation', instructor: 'Naledi Dlamini', category: 'Finance', level: 'Advanced', duration_hours: 7, lessons: 20, progress: 40, xp_reward: 450, thumbnail_color: '#ef4444', description: 'Build 3-statement models, DCF valuations, and scenario analysis decks used by top African VCs.', tags: ['finance', 'modeling', 'valuation'] },
  { id: '6', title: 'Go-to-Market for African Markets', instructor: 'Ibrahim Yusuf', category: 'Marketing', level: 'Beginner', duration_hours: 5, lessons: 15, progress: 0, xp_reward: 300, thumbnail_color: '#06b6d4', description: 'Craft GTM strategies tailored for Anglophone and Francophone African markets with low CAC playbooks.', tags: ['gtm', 'marketing', 'africa'] },
];

const CATEGORIES = ['All', 'Finance', 'Growth', 'Legal', 'Technology', 'Marketing'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];

function ElearningContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeLevel, setActiveLevel] = useState('All');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [totalXP] = useState(1050); // Simulated total XP

  const filtered = courses.filter(c => {
    const matchCat = activeCategory === 'All' || c.category === activeCategory;
    const matchLvl = activeLevel === 'All' || c.level === activeLevel;
    return matchCat && matchLvl;
  });

  const completedCount = courses.filter(c => c.progress === 100).length;
  const inProgressCount = courses.filter(c => c.progress > 0 && c.progress < 100).length;

  const handleContinueCourse = (course: Course) => {
    if (course.progress === 100) {
      alert('You have completed this course! 🎓 Check back for advanced modules.');
      return;
    }
    // Simulate progress increment
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, progress: Math.min(100, c.progress + 10) } : c));
    setActiveCourse(null);
  };

  if (activeCourse) {
    return (
      <div className="fade-in">
        <button onClick={() => setActiveCourse(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Back to Hub
        </button>
        <div className="glass-panel" style={{ padding: '40px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '16px', backgroundColor: activeCourse.thumbnail_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>🎓</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>{activeCourse.level}</span>
                <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>{activeCourse.category}</span>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontFamily: 'Outfit', marginBottom: '8px' }}>{activeCourse.title}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>by {activeCourse.instructor}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '20px' }}>{activeCourse.description}</p>
              <div style={{ display: 'flex', gap: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                <span>⏱ {activeCourse.duration_hours}h total</span>
                <span>📚 {activeCourse.lessons} lessons</span>
                <span>⚡ +{activeCourse.xp_reward} XP on completion</span>
              </div>
              {/* Progress bar */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>Course Progress</span>
                  <span style={{ fontWeight: 700, color: activeCourse.progress === 100 ? 'var(--brand-green)' : 'white' }}>{activeCourse.progress}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${activeCourse.progress}%`, backgroundColor: activeCourse.progress === 100 ? 'var(--brand-green)' : 'var(--brand-amber)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <button onClick={() => handleContinueCourse(activeCourse)} className="btn-primary" style={{ padding: '12px 28px', fontSize: '0.9rem', marginTop: '16px' }}>
                {activeCourse.progress === 0 ? '▶ Start Course' : activeCourse.progress === 100 ? '✓ Completed' : '▶ Continue Learning'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Hero section */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', marginBottom: '8px' }}>E-Learning Hub</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Curated courses designed for African founders, investors, and ecosystem builders.
        </p>
      </div>

      {/* XP Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total XP Earned', value: totalXP.toLocaleString(), color: 'var(--brand-green)', icon: '⚡' },
          { label: 'Courses Completed', value: completedCount, color: 'var(--brand-green)', icon: '🎓' },
          { label: 'In Progress', value: inProgressCount, color: 'var(--brand-amber)', icon: '📖' },
          { label: 'Available Courses', value: courses.length, color: '#3b82f6', icon: '🗂️' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{stat.icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color, fontFamily: 'Outfit' }}>{stat.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '20px', cursor: 'pointer', fontFamily: 'inherit', backgroundColor: activeCategory === cat ? 'rgba(45, 181, 98, 0.15)' : 'rgba(255,255,255,0.03)', border: activeCategory === cat ? '1px solid rgba(45, 181, 98, 0.4)' : '1px solid var(--border-color)', color: activeCategory === cat ? 'var(--brand-green)' : 'var(--text-secondary)', fontWeight: activeCategory === cat ? 600 : 400, transition: 'all 0.2s' }}>
              {cat}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {LEVELS.map(lvl => (
            <button key={lvl} onClick={() => setActiveLevel(lvl)} style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '20px', cursor: 'pointer', fontFamily: 'inherit', backgroundColor: activeLevel === lvl ? 'rgba(232, 160, 32, 0.15)' : 'rgba(255,255,255,0.03)', border: activeLevel === lvl ? '1px solid rgba(232, 160, 32, 0.4)' : '1px solid var(--border-color)', color: activeLevel === lvl ? 'var(--brand-amber)' : 'var(--text-secondary)', fontWeight: activeLevel === lvl ? 600 : 400, transition: 'all 0.2s' }}>
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {filtered.map(course => (
          <div key={course.id} className="glass-panel glass-panel-hover" onClick={() => setActiveCourse(course)} style={{ padding: '0', overflow: 'hidden', cursor: 'pointer' }}>
            {/* Course header bar */}
            <div style={{ height: '6px', backgroundColor: course.thumbnail_color, width: `${Math.max(course.progress, 8)}%`, transition: 'width 0.5s ease' }} />
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span className="badge badge-amber" style={{ fontSize: '0.62rem' }}>{course.level}</span>
                <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{course.category}</span>
                {course.progress === 100 && <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>✓ Completed</span>}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.35, marginBottom: '8px' }}>{course.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>{course.description.slice(0, 100)}...</p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <span>⏱ {course.duration_hours}h</span>
                <span>📚 {course.lessons} lessons</span>
                <span style={{ color: 'var(--brand-amber)', fontWeight: 600 }}>+{course.xp_reward} XP</span>
              </div>
              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>{course.progress === 0 ? 'Not started' : course.progress === 100 ? 'Completed' : 'In progress'}</span>
                  <span style={{ fontWeight: 600 }}>{course.progress}%</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${course.progress}%`, backgroundColor: course.progress === 100 ? 'var(--brand-green)' : course.thumbnail_color, borderRadius: '99px' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ElearningPage() {
  return (
    <RouteGuard>
      <DashboardLayout>
        <ElearningContent />
      </DashboardLayout>
    </RouteGuard>
  );
}
