import React from 'react';
import './CollapsibleSection.css';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const CollapsibleSection = ({ title, children, defaultOpen = true }: CollapsibleSectionProps) => (
  <details className="inspector-section" open={defaultOpen}>
    <summary className="inspector-section-header">{title}</summary>
    <div className="inspector-section-body">{children}</div>
  </details>
);
