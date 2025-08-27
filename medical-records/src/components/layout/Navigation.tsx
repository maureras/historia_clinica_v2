// src/components/layout/Navigation.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  description: string
}

interface NavigationProps {
  item: NavigationItem
  isActive: boolean
  isCollapsed: boolean
}

export default function Navigation({ item, isActive, isCollapsed }: NavigationProps) {
  const Icon = item.icon

  return (
    <Link
      to={item.href}
      className={clsx(
        'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        {
          'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md': isActive,
          'text-slate-700 hover:bg-slate-100 hover:text-slate-900': !isActive,
        }
      )}
      title={isCollapsed ? item.name : undefined}
    >
      <Icon className={clsx(
        'h-5 w-5 flex-shrink-0 transition-colors',
        {
          'text-white': isActive,
          'text-slate-400 group-hover:text-slate-600': !isActive,
        }
      )} />
      
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <div className="truncate">{item.name}</div>
          {!isActive && (
            <div className="text-xs text-slate-500 group-hover:text-slate-600 truncate">
              {item.description}
            </div>
          )}
        </div>
      )}
      
      {isActive && !isCollapsed && (
        <div className="h-2 w-2 bg-white rounded-full" />
      )}
    </Link>
  )
}
