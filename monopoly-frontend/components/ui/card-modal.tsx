/**
 * Card Modal Component
 * 
 * Shows Chance and Community Chest cards with animation
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardType: 'chance' | 'community_chest' | null;
  description: string;
  action?: string;
}

export function CardModal({ isOpen, onClose, cardType, description }: CardModalProps) {
  if (!isOpen || !cardType) return null;

  const isChance = cardType === 'chance';
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Card */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ 
                scale: 0.5, 
                rotateY: 180,
                opacity: 0 
              }}
              animate={{ 
                scale: 1, 
                rotateY: 0,
                opacity: 1 
              }}
              exit={{ 
                scale: 0.5, 
                rotateY: -180,
                opacity: 0 
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              className="pointer-events-auto w-full max-w-md"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className={`
                relative rounded-2xl shadow-2xl overflow-hidden
                ${isChance 
                  ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600' 
                  : 'bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600'
                }
              `}>
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
                >
                  <X className="w-6 h-6" />
                </button>
                
                {/* Card Header */}
                <div className="pt-8 pb-6 px-6 text-center border-b border-white/20">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="inline-block text-6xl mb-3"
                  >
                    {isChance ? '?' : '💰'}
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">
                    {isChance ? 'KANS' : 'ALGEMEEN FONDS'}
                  </h2>
                </div>
                
                {/* Card Body */}
                <div className="p-8 bg-white/10 backdrop-blur-sm">
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-white text-lg text-center font-medium leading-relaxed min-h-[120px] flex items-center justify-center"
                  >
                    {description}
                  </motion.p>
                </div>
                
                {/* Card Footer */}
                <div className="p-6 bg-white/5">
                  <Button
                    onClick={onClose}
                    className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold"
                    size="lg"
                  >
                    Doorgaan
                  </Button>
                </div>
                
                {/* Decorative corner */}
                <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-br-full" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-tl-full" />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

