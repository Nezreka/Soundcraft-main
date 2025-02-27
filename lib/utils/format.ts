import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';


// Utility for merging class names with Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format time in seconds to mm:ss format
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Format frequency in Hz to a more readable format
export function formatFrequency(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)}kHz`;
  }
  return `${Math.round(hz)}Hz`;
}

// Format decibels
export function formatDb(db: number): string {
  return `${db > 0 ? '+' : ''}${db.toFixed(1)}dB`;
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Generate a random ID
export function generateId(): string {
  return uuidv4();
}