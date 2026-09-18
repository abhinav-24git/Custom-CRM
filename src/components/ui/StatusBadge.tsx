import React from 'react';

export type BadgeVariant =
  | 'completed'
  | 'closed'
  | 'accepted'
  | 'resolved'
  | 'in-progress'
  | 'partial'
  | 'action-open'
  | 'action-required'
  | 'draft'
  | 'open'
  | 'released'
  | 'requested'
  | 'received'
  | 'rejected'
  | 'cancelled'
  | 'scrap'
  | 'blocked';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
}

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  // Normalize string to determine variant if not explicitly passed
  const s = (variant || status || '').toLowerCase().trim();

  let className = 'badge badge-open'; // Default blue / open

  if (
    s.includes('completed') ||
    s.includes('closed') ||
    s.includes('accepted') ||
    s.includes('resolved') ||
    s.includes('success')
  ) {
    className = 'badge badge-closed'; // Green
  } else if (
    s.includes('progress') ||
    s.includes('partial') ||
    s.includes('action open') ||
    s.includes('action required') ||
    s.includes('checked') ||
    s.includes('contacted') ||
    s.includes('quoted') ||
    s.includes('sent')
  ) {
    className = 'badge badge-partially'; // Amber
  } else if (
    s.includes('rejected') ||
    s.includes('cancelled') ||
    s.includes('scrap') ||
    s.includes('blocked') ||
    s.includes('danger')
  ) {
    className = 'badge badge-rejected'; // Red
  } else {
    className = 'badge badge-open'; // Blue / Neutral / Draft / Open
  }

  return <span className={className}>{status}</span>;
}
