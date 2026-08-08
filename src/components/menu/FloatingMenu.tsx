import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useTransform } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Home, Folder, User, Mail } from 'lucide-react';
import { useMousePosition } from '../../hooks/useMousePosition';
import { useCursor } from '../../context/CursorContext';
import './FloatingMenu.css';

// Extracted MenuItem component to manage its own MotionValues independently
const MenuItem = ({ item, i, isOpen, setVariant, setIsOpen, rawX, rawY, menuItemsLength }: any) => {
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  
  const reverseIndex = menuItemsLength - i; 
  const s = reverseIndex / menuItemsLength;

  const menuBaseX = windowWidth - 100;
  const menuBaseY = windowHeight - 60;

  // Derive all transformations from the mouse position without React state updates
  const transformX = useTransform([rawX, rawY], ([latestRawX, latestRawY]) => {
    if (!isOpen) return 0;
    const dx = (latestRawX as number) - menuBaseX;
    const dy = (latestRawY as number) - menuBaseY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const influence = Math.max(0, 1 - dist / 500); 
    const clampedDx = Math.max(-400, Math.min(400, dx));
    const maxBendX = clampedDx * 0.22 * influence;
    return maxBendX * (s * s);
  });

  const transformY = useTransform([rawX, rawY], ([latestRawX, latestRawY]) => {
    if (!isOpen) return 0;
    const dx = (latestRawX as number) - menuBaseX;
    const dy = (latestRawY as number) - menuBaseY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const influence = Math.max(0, 1 - dist / 500); 
    return 20 * influence * (s * s);
  });

  const rotateZ = useTransform([rawX, rawY], ([latestRawX, latestRawY]) => {
    if (!isOpen) return 0;
    const dx = (latestRawX as number) - menuBaseX;
    const dy = (latestRawY as number) - menuBaseY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const influence = Math.max(0, 1 - dist / 500); 
    const clampedDx = Math.max(-400, Math.min(400, dx));
    const maxRotate = clampedDx * 0.08 * influence;
    return maxRotate * s;
  });

  const transformOrigin = useTransform([rawX], ([latestRawX]) => {
    if (!isOpen) return '50% 50%';
    const dx = (latestRawX as number) - menuBaseX;
    const clampedDx = Math.max(-400, Math.min(400, dx));
    const originX = Math.max(20, Math.min(80, 50 + (clampedDx / 300) * 30));
    return `${originX}% 50%`;
  });

  return (
    <motion.div
      custom={reverseIndex}
      variants={{
        open: { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          transition: { 
            type: 'spring', 
            stiffness: 500, 
            damping: 18, 
            mass: 0.8 
          } 
        },
        closed: (customIndex) => ({ 
          opacity: 0, 
          y: 68 + (customIndex - 1) * 64, 
          scale: 1, 
          transition: { 
            y: { duration: 0.35, ease: "backIn" },
            opacity: { duration: 0.2, delay: 0.15 }
          } 
        })
      }}
      style={{ zIndex: 10 - reverseIndex, position: 'relative' }}
    >
      <motion.div
        style={{
          x: transformX,
          y: transformY,
          rotate: rotateZ,
          transformOrigin: transformOrigin
        }}
        animate={isOpen ? {} : { x: 0, y: 0, rotate: 0, transformOrigin: '50% 50%' }}
        transition={{ type: 'spring', stiffness: 120, damping: 8, mass: 1 }}
      >
        <Link 
          to={item.path} 
          className="menu-pill" 
          onClick={() => {
            setIsOpen(false);
            setVariant('default');
          }} 
          data-cursor={isOpen ? "expand" : undefined}
        >
          <div className="menu-pill-icon">{item.icon}</div>
          <span className="menu-pill-label" style={{ fontSize: '0.85rem' }}>{item.label}</span>
          <svg className="menu-pill-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { setVariant } = useCursor();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 800); // 800ms delay before closing
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const menuItems = [
    { label: 'HOME', path: '/', icon: <Home size={18} strokeWidth={2.5} /> },
    { label: 'PROJECTS', path: '/projects', icon: <Folder size={18} strokeWidth={2.5} /> },
    { label: 'ABOUT', path: '/about', icon: <User size={18} strokeWidth={2.5} /> },
    { label: 'CONTACT', path: '/contact', icon: <Mail size={18} strokeWidth={2.5} /> }
  ];

  const activeItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  const { rawX, rawY } = useMousePosition();

  return (
    <div 
      className="floating-menu-container" 
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="menu-items"
            initial="closed"
            animate="open"
            exit="closed"
            variants={{
              open: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
              closed: { transition: { staggerChildren: 0.04, staggerDirection: 1 } }
            }}
          >
            {menuItems.map((item, i) => (
              <MenuItem
                key={i}
                item={item}
                i={i}
                isOpen={isOpen}
                setVariant={setVariant}
                setIsOpen={setIsOpen}
                rawX={rawX}
                rawY={rawY}
                menuItemsLength={menuItems.length}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className={`floating-menu-toggle ${isOpen ? 'open' : ''}`}
        data-cursor="expand"
        style={{ zIndex: 20, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: 'none', background: 'var(--zzz-black)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div className="menu-pill-icon" style={{ margin: 0, marginRight: '12px' }}>{activeItem.icon}</div>
          <span className="toggle-label" style={{ fontSize: '0.85rem' }}>{activeItem.label}</span>
        </div>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '12px',
          transformOrigin: '50% 60%',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          opacity: 0.5
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
            <polygon points="12,5 4,19 20,19" />
          </svg>
        </div>
      </motion.button>
    </div>
  );
}
