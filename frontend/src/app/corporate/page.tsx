'use client';

import React from 'react';
import RouteGuard from '../../components/RouteGuard';
import PortalsDashboard from '../investor/page';

export default function CorporatePage() {
  return (
    <RouteGuard allowedRoles={['corporate', 'admin', 'investor']}>
      <PortalsDashboard />
    </RouteGuard>
  );
}
