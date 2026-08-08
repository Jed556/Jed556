import { useEffect, useState, useRef } from 'react';
import type { JSX } from 'react';
import './GlitchText.css';

interface GlitchTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEF';

export default function GlitchText({ text, delay = 0, speed = 50, className = '', as: Component = 'span' }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isResolved, setIsResolved] = useState(false);
  const animationRef = useRef<number>(null);
  const startTimeRef = useRef<number>(null);

  useEffect(() => {
    let timeoutId: number;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      
      const resolvedCharsCount = Math.floor(elapsed / speed);
      
      if (resolvedCharsCount >= text.length) {
        setDisplayText(text);
        setIsResolved(true);
        return;
      }

      let currentText = text.substring(0, resolvedCharsCount);
      for (let i = resolvedCharsCount; i < text.length; i++) {
        currentText += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      
      setDisplayText(currentText);
      animationRef.current = requestAnimationFrame(animate);
    };

    timeoutId = window.setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [text, delay, speed]);

  const Comp = Component as any;

  return (
    <Comp 
      className={`glitch-text ${isResolved ? 'resolved' : ''} ${className}`} 
      data-text={text}
    >
      {displayText}
    </Comp>
  );
}
