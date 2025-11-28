'use client';

import React from 'react';
import TourTimeline from '@/components/TourTimeline';
import AuthGuard from '@/components/AuthGuard';

export default function CompetitorsTimelinePage() {
  return (
    <AuthGuard>
      <TourTimeline />
    </AuthGuard>
  );
}
