'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container">
      <div className="card center" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <h1 className="page-title">Page not found</h1>
        <p className="page-sub">The page you are looking for doesn’t exist or has been moved.</p>
        <Link href="/" className="btn">
          Back to home
        </Link>
      </div>
    </div>
  );
}