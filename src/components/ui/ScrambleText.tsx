import React, { useState, useEffect } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}|:<>?';

interface ScrambleTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  sequential?: boolean;
  start?: boolean;
}

const ScrambleText: React.FC<ScrambleTextProps> = ({ text, className = '', delay = 0, duration = 1500, sequential = true, start = true }) => {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!start) return;

    let timeout: number;
    let interval: number;
    
    timeout = window.setTimeout(() => {
      setStarted(true);
      let step = 0;
      const totalSteps = duration / 40; // 40ms per frame to feel slightly chunky like a terminal
      
      interval = window.setInterval(() => {
        step++;
        const progress = step / totalSteps;
        
        let newText = '';
        for (let i = 0; i < text.length; i++) {
          if (text[i] === ' ' || text[i] === '\n') {
            newText += text[i];
            continue;
          }
          // The later the character is in the string, the later it resolves
          if (progress > (i / text.length) * 0.8) {
            newText += text[i];
          } else {
            newText += CHARS[Math.floor(Math.random() * CHARS.length)];
            if (sequential) break;
          }
        }
        
        setDisplayText(newText);
        
        if (step >= totalSteps) {
          setDisplayText(text);
          clearInterval(interval);
        }
      }, 40);
    }, delay);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, delay, duration, start]);

  return (
    <span 
      className={className} 
      style={{ whiteSpace: 'pre-wrap', opacity: started ? 1 : 0 }}
    >
      {displayText}
    </span>
  );
};

export default ScrambleText;
