'use client';

import React, { useState, useEffect } from 'react';
import RouteGuard from '../../components/RouteGuard';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../lib/api';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  seller_name: string;
  seller_country: string;
  category: string;
  tags: string[];
  image_url?: string;
}

const CATEGORIES = ['All', 'SaaS Tools', 'Consulting', 'Legal', 'Design', 'Marketing', 'Logistics', 'Finance'];

function MarketplaceContent() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingListing, setCreatingListing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', price: '', currency: 'USD', category: 'SaaS Tools', tags: '',
  });

  // Seed mock listings since marketplace backend isn't built yet
  const mockListings: Listing[] = [
    { id: '1', title: 'Startup Legal Toolkit', description: 'Full incorporation package with shareholder agreements, IP assignment, and ESOP templates for African startups.', price: 299, currency: 'USD', seller_name: 'LegalEase Africa', seller_country: 'KE', category: 'Legal', tags: ['legal', 'incorporation', 'esop'] },
    { id: '2', title: 'GTM Strategy Workshop', description: '4-week go-to-market strategy intensive for B2B SaaS founders. Includes market sizing, ICP definition, and sales playbook.', price: 850, currency: 'USD', seller_name: 'ScaleUp Consulting', seller_country: 'NG', category: 'Consulting', tags: ['gtm', 'strategy', 'b2b'] },
    { id: '3', title: 'Brand Identity Design Pack', description: 'Professional brand identity design — logo, typography, colors, brand guidelines, and 10 social media templates.', price: 450, currency: 'USD', seller_name: 'Pixel & Prose Studio', seller_country: 'GH', category: 'Design', tags: ['branding', 'design', 'identity'] },
    { id: '4', title: 'Investor Pitch Deck Review', description: 'Expert review of your pitch deck by a former VC analyst. Includes detailed feedback on story, financials, and market slide.', price: 199, currency: 'USD', seller_name: 'PitchReady', seller_country: 'ZA', category: 'Finance', tags: ['pitch', 'fundraising', 'investor'] },
    { id: '5', title: 'Digital Marketing Accelerator', description: 'Full-funnel digital marketing setup — Google Ads, Meta campaigns, email automation, and conversion tracking.', price: 650, currency: 'USD', seller_name: 'GrowthLab', seller_country: 'RW', category: 'Marketing', tags: ['marketing', 'ads', 'growth'] },
    { id: '6', title: 'Supply Chain Integration API', description: 'SaaS API for African logistics and last-mile delivery tracking. Integrates with Sendy, Bolt Logistics, and Aramex.', price: 120, currency: 'USD', seller_name: 'LogiConnect', seller_country: 'TZ', category: 'Logistics', tags: ['logistics', 'api', 'saas'] },
  ];

  useEffect(() => {
    // Simulate fetching with a short delay
    setTimeout(() => {
      setListings(mockListings);
      setLoading(false);
    }, 800);
  }, []);

  const filtered = listings.filter(l => {
    const matchCat = activeCategory === 'All' || l.category === activeCategory;
    const matchQ = !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  });

  const handleSubmitListing = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const newListing: Listing = {
        id: String(Date.now()),
        title: form.title,
        description: form.description,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        seller_name: `${user?.first_name} ${user?.last_name}`,
        seller_country: user?.country || 'AF',
        category: form.category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      setListings(prev => [newListing, ...prev]);
      setSuccessMsg('Your listing has been published to the marketplace!');
      setCreatingListing(false);
      setForm({ title: '', description: '', price: '', currency: 'USD', category: 'SaaS Tools', tags: '' });
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', marginBottom: '8px' }}>B2B Marketplace</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Africa's premier ecosystem marketplace — discover services, tools, and expertise from verified founders.
          </p>
        </div>
        <button
          onClick={() => { setCreatingListing(!creatingListing); setSuccessMsg(null); }}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.85rem' }}
        >
          {creatingListing ? '← Back to Listings' : '+ List Your Service'}
        </button>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: 'rgba(45, 181, 98, 0.1)', border: '1px solid rgba(45, 181, 98, 0.2)', color: 'var(--brand-green)', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '24px' }}>
          ✓ {successMsg}
        </div>
      )}

      {creatingListing ? (
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '640px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', fontFamily: 'Outfit' }}>Create a Marketplace Listing</h2>
          <form onSubmit={handleSubmitListing}>
            <div className="form-group">
              <label className="form-label">Listing Title *</label>
              <input type="text" className="form-input" placeholder="e.g. Full-Stack MVP Development" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-input" rows={4} placeholder="What exactly do you offer? Include scope and deliverables." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Price *</label>
                <input type="number" className="form-input" placeholder="e.g. 299" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="GHS">GHS</option>
                  <option value="NGN">NGN</option>
                  <option value="KES">KES</option>
                  <option value="ZAR">ZAR</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input type="text" className="form-input" placeholder="e.g. saas, legal, fintech" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              {submitting ? 'Publishing...' : 'Publish Listing'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Search + Filters */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍  Search services, tools, expertise..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: '1 1 260px', padding: '10px 16px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Category Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', cursor: 'pointer', fontFamily: 'inherit',
                  backgroundColor: activeCategory === cat ? 'rgba(45, 181, 98, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: activeCategory === cat ? '1px solid rgba(45, 181, 98, 0.4)' : '1px solid var(--border-color)',
                  color: activeCategory === cat ? 'var(--brand-green)' : 'var(--text-secondary)',
                  fontWeight: activeCategory === cat ? 600 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {[1, 2, 3].map(i => <div key={i} className="glass-panel shimmer-box" style={{ height: '220px' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛒</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No listings found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '340px', margin: '0 auto', marginBottom: '24px' }}>
                Try a different search term or category, or be the first to list in this space.
              </p>
              <button onClick={() => setCreatingListing(true)} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                + List Your Service
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {filtered.map(listing => (
                <div key={listing.id} className="glass-panel glass-panel-hover" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>{listing.category}</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-green)', fontFamily: 'Outfit', whiteSpace: 'nowrap' }}>
                      {listing.currency} {listing.price.toLocaleString()}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>{listing.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{listing.description}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {listing.tags.map((tag, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      by <strong style={{ color: 'var(--text-secondary)' }}>{listing.seller_name}</strong> · {listing.seller_country}
                    </div>
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      onClick={() => alert(`Contact ${listing.seller_name} to purchase this service.`)}
                    >
                      Contact Seller
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-color: rgba(255,255,255,0.01); }
          50% { background-color: rgba(255,255,255,0.05); }
          100% { background-color: rgba(255,255,255,0.01); }
        }
        .shimmer-box { animation: shimmer 1.5s infinite ease-in-out; border-color: rgba(255,255,255,0.04) !important; }
      `}</style>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <RouteGuard>
      <DashboardLayout>
        <MarketplaceContent />
      </DashboardLayout>
    </RouteGuard>
  );
}
