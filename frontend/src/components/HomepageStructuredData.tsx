'use client';

/**
 * HomepageStructuredData
 *
 * Injects page-specific JSON-LD schemas for the homepage.
 * Renders nothing visible — only <script> tags in the <head> via a portal-like approach.
 * Used inside the homepage client component since metadata API can't be used with 'use client'.
 */
export default function HomepageStructuredData() {
  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HopeFusion Africa',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: 'https://hopefusionafrica.com',
    description:
      "Ghana's and Africa's #1 AI-powered startup ecosystem platform — connecting founders with investors, grants, mentors, and opportunities.",
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GHS',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '312',
      bestRating: '5',
    },
    author: {
      '@type': 'Organization',
      name: 'HopeFusion Africa',
    },
    screenshot: 'https://hopefusionafrica.com/images/hopefusion-og.png',
    featureList: [
      'AI-powered startup-investor matching',
      'Grants and funding discovery',
      'Startup mentorship',
      'B2B marketplace',
      'eLearning for African founders',
      'Real-time collaboration',
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is HopeFusion Africa?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "HopeFusion Africa is Ghana's and Africa's leading AI-powered startup ecosystem platform that connects founders, investors, mentors, and opportunities across the continent.",
        },
      },
      {
        '@type': 'Question',
        name: 'Is HopeFusion Africa free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes — registering and accessing core features like grants discovery, AI matching, and the marketplace is free for startups.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the AI matching work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our AI matching engine analyses your startup profile — sector, stage, funding needs, team — and matches you with compatible investors, mentors, and strategic partners using deep similarity algorithms.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I find startup grants in Ghana on HopeFusion Africa?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Absolutely. HopeFusion Africa curates startup grants, equity-free capital, and government-backed funding opportunities specifically for Ghana and across Africa, updated daily.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is HopeFusion Africa available as a mobile app?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes — HopeFusion Africa is available as a Progressive Web App (PWA) and on the Apple App Store and Google Play Store.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
