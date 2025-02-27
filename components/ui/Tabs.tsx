import React, { useState } from 'react';
import { cn } from '@/lib/utils/format';
import { TabItem } from '@/types/ui';

interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  variant?: 'default' | 'underline' | 'pills';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTabId,
  variant = 'default',
  className,
}) => {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className={cn(
        'flex',
        variant === 'default' && 'border-b border-white/10 mb-4',
        variant === 'underline' && 'mb-4',
        variant === 'pills' && 'mb-4 p-1 neumorphic-inset rounded-lg'
      )}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              'px-4 py-2 text-sm transition-all',
              variant === 'default' && [
                'border-b-2',
                activeTabId === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-white/10'
              ],
              variant === 'underline' && [
                'border-b-2',
                activeTabId === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              ],
              variant === 'pills' && [
                'rounded-md',
                activeTabId === tab.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-text-secondary hover:bg-white/5'
              ]
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1">
        {activeTab?.content}
      </div>
    </div>
  );
};

export { Tabs };