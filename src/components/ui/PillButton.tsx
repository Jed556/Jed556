import React from 'react';
import './PillButton.css';

interface PillButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'filled' | 'ghost';
  icon?: React.ReactNode;
  className?: string;
}

export default function PillButton({
  label,
  href,
  onClick,
  size = 'md',
  variant = 'filled',
  icon,
  className = ''
}: PillButtonProps) {
  const classes = `pill-button btn-size-${size} btn-variant-${variant} ${className}`;
  const content = (
    <>
      <span className="btn-content-wrapper">
        <span className="btn-text btn-text-top">{label}</span>
        <span className="btn-text btn-text-bottom">{label}</span>
      </span>
      {icon && <span className="btn-icon">{icon}</span>}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} data-cursor="expand" onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} data-cursor="expand" onClick={onClick}>
      {content}
    </button>
  );
}
