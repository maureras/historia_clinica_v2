import React from "react";
import { motion } from "framer-motion";

export const MotionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <motion.div
    className={`bg-white rounded-xl shadow-lg border border-slate-200 ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.div>
);