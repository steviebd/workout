import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-[13px] text-muted-foreground/90 leading-snug mt-1">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
