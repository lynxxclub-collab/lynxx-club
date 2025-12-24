import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function OnlineIndicator({ 
  online = false, 
  size = 'md',
  className 
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span 
      className={cn(
        "rounded-full border-2 border-background",
        sizeClasses[size],
        online 
          ? "bg-teal animate-pulse" 
          : "bg-muted-foreground",
        className
      )}
      title={online ? 'Online' : 'Offline'}
    />
  );
}