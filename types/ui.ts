export interface ModalProps {
    isOpen: boolean;
    onClose: (() => void) | undefined;  // Allow onClose to be undefined
    title: string;
    children: React.ReactNode;
    preventOutsideClose?: boolean;
  }
  
  export type KnobProps = {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    label: string;
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    showValue?: boolean;
    unit?: string;
    bipolar?: boolean;
  };
  
  export type SliderProps = {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    label: string;
    showValue?: boolean;
    unit?: string;
    vertical?: boolean;
    bipolar?: boolean;
    showValueAsPercentage?: boolean;
    className?: string;  // Add className for custom styling
  };
  
  export type TabItem = {
    id: string;
    label: string;
    content: React.ReactNode;
  };