import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { Preset, TimelinePreset } from '@/types/preset';

// Hook for managing presets
export function usePresets() {
  const { 
    presets, 
    savePreset, 
    loadPreset, 
    deletePreset,
    timelinePresets,
    saveTimelinePreset,
    loadTimelinePreset,
    deleteTimelinePreset
  } = useStore();
  
  const [filteredPresets, setFilteredPresets] = useState<Preset[]>(presets);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Filter presets when search term or category changes
  useEffect(() => {
    let filtered = presets;
    
    if (searchTerm) {
      filtered = filtered.filter(preset => 
        preset.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(preset => 
        preset.category === categoryFilter
      );
    }
    
    setFilteredPresets(filtered);
  }, [presets, searchTerm, categoryFilter]);
  
  // Get unique categories using Array.from instead of spread operator
  const categories = Array.from(new Set(presets.map(preset => preset.category)));
  
  return {
    presets: filteredPresets,
    timelinePresets,
    categories,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    savePreset,
    loadPreset,
    deletePreset,
    saveTimelinePreset,
    loadTimelinePreset,
    deleteTimelinePreset
  };
}