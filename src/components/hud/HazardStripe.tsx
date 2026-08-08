
import './HazardStripe.css';

interface HazardStripeProps {
  height?: string | number;
  className?: string;
}

export default function HazardStripe({ height = 4, className = '' }: HazardStripeProps) {
  return (
    <div 
      className={`hazard-stripe ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
}
