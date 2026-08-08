import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrollingNumberProps {
  value: string;
}

const DigitColumn = ({ digit, index }: { digit: string, index: number }) => {
  if (isNaN(parseInt(digit))) {
    return <span style={{ display: 'inline-block' }}>{digit}</span>;
  }
  const num = parseInt(digit);
  
  return (
    <div style={{ display: 'inline-block', position: 'relative', height: '1.05em', overflow: 'hidden', verticalAlign: 'top' }}>
      {/* Invisible static digit to force the correct container width */}
      <span style={{ visibility: 'hidden' }}>0</span>
      <motion.div
        initial={false}
        animate={{ y: `-${num * 10}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: index * 0.05 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => (
          <div key={val} style={{ height: '1.05em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {val}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const ScrollingNumber: React.FC<ScrollingNumberProps> = ({ value }) => {
  return (
    <div style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums', alignItems: 'center' }}>
      <AnimatePresence mode="popLayout">
        {value.split('').map((char, i) => (
          <motion.div
            key={`${i}-${isNaN(parseInt(char)) ? char : 'num'}`} 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden', display: 'inline-flex' }}
          >
            <DigitColumn digit={char} index={i} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ScrollingNumber;
