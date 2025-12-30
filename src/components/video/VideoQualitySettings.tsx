import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Settings, Wifi, WifiOff, WifiLow } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QualityPreset {
  id: string;
  label: string;
  description: string;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  auto: {
    id: 'auto',
    label: 'Auto',
    description: 'Adapts to your connection',
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 1500000,
  },
  high: {
    id: 'high',
    label: 'High (1080p)',
    description: 'Best quality, requires good connection',
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: 2500000,
  },
  medium: {
    id: 'medium',
    label: 'Medium (720p)',
    description: 'Balanced quality and performance',
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 1000000,
  },
  low: {
    id: 'low',
    label: 'Low (480p)',
    description: 'For slower connections',
    width: 854,
    height: 480,
    frameRate: 24,
    bitrate: 500000,
  },
  dataSaver: {
    id: 'dataSaver',
    label: 'Data Saver (360p)',
    description: 'Minimum bandwidth usage',
    width: 640,
    height: 360,
    frameRate: 15,
    bitrate: 250000,
  },
};

interface VideoQualitySettingsProps {
  currentQuality: string;
  onQualityChange: (qualityId: string) => void;
  networkQuality?: 'good' | 'fair' | 'poor' | 'unknown';
  disabled?: boolean;
}

export default function VideoQualitySettings({
  currentQuality,
  onQualityChange,
  networkQuality = 'unknown',
  disabled = false,
}: VideoQualitySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getNetworkIcon = () => {
    switch (networkQuality) {
      case 'good':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'fair':
        return <WifiLow className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <WifiOff className="w-4 h-4 text-destructive" />;
      default:
        return <Wifi className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNetworkLabel = () => {
    switch (networkQuality) {
      case 'good':
        return 'Excellent';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          disabled={disabled}
          className="rounded-full w-16 h-16 border-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
          aria-label="Video quality settings"
        >
          <Settings className="w-6 h-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 bg-background/95 backdrop-blur-lg border-border"
        side="top"
        align="center"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Video Quality</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getNetworkIcon()}
              <span>{getNetworkLabel()}</span>
            </div>
          </div>

          <RadioGroup
            value={currentQuality}
            onValueChange={(value) => {
              onQualityChange(value);
              setIsOpen(false);
            }}
            className="space-y-2"
          >
            {Object.values(QUALITY_PRESETS).map((preset) => (
              <div
                key={preset.id}
                className={cn(
                  'flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  currentQuality === preset.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent/50'
                )}
                onClick={() => {
                  onQualityChange(preset.id);
                  setIsOpen(false);
                }}
              >
                <RadioGroupItem value={preset.id} id={preset.id} />
                <div className="flex-1">
                  <Label
                    htmlFor={preset.id}
                    className="font-medium cursor-pointer"
                  >
                    {preset.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {preset.description}
                  </p>
                </div>
                {preset.id !== 'auto' && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(preset.bitrate / 1000)} kbps
                  </span>
                )}
              </div>
            ))}
          </RadioGroup>

          {currentQuality === 'auto' && (
            <p className="text-xs text-muted-foreground">
              Quality will automatically adjust based on your network conditions.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
