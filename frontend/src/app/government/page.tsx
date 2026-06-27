'use client';

import React from 'react';
import RouteGuard from '../../components/RouteGuard';
import PortalsDashboard from '../investor/page';

export default function GovernmentPage() {
  return (
    <RouteGuard allowedRoles={['government', 'admin', 'investor']}>
      <PortalsDashboard />
    </RouteGuard>
  );
}
