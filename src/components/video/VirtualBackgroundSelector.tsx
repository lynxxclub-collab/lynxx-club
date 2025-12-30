import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, User, Droplets, Palette, ImageIcon, X } from 'lucide-react';
import { loadSegmentationModel, isModelLoaded, BackgroundEffect } from '@/lib/backgroundRemoval';
import { cn } from '@/lib/utils';

interface VirtualBackgroundSelectorProps {
  currentEffect: BackgroundEffect;
  onEffectChange: (effect: BackgroundEffect) => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#1a1a2e', // Dark blue
  '#16213e', // Navy
  '#0f3460', // Deep blue
  '#533483', // Purple
  '#2c3e50', // Dark slate
  '#1e272e', // Charcoal
  '#192a56', // Dark navy
  '#40407a', // Muted purple
];

export default function VirtualBackgroundSelector({
  currentEffect,
  onEffectChange,
  disabled = false,
}: VirtualBackgroundSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [blurAmount, setBlurAmount] = useState(15);

  useEffect(() => {
    setModelReady(isModelLoaded());
  }, []);

  const handleLoadModel = async () => {
    setIsLoading(true);
    const success = await loadSegmentationModel();
    setModelReady(success);
    setIsLoading(false);
  };

  const handleSelectNone = () => {
    onEffectChange({ type: 'none' });
  };

  const handleSelectBlur = () => {
    if (!modelReady) {
      handleLoadModel().then(() => {
        onEffectChange({ type: 'blur', blurAmount });
      });
    } else {
      onEffectChange({ type: 'blur', blurAmount });
    }
  };

  const handleSelectColor = (color: string) => {
    if (!modelReady) {
      handleLoadModel().then(() => {
        onEffectChange({ type: 'color', value: color });
      });
    } else {
      onEffectChange({ type: 'color', value: color });
    }
  };

  const handleBlurAmountChange = (value: number[]) => {
    setBlurAmount(value[0]);
    if (currentEffect.type === 'blur') {
      onEffectChange({ type: 'blur', blurAmount: value[0] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Virtual Background</Label>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading AI model...
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* None */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleSelectNone}
          className={cn(
            'aspect-square rounded-lg border-2 flex items-center justify-center transition-all',
            currentEffect.type === 'none'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          )}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Blur */}
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={handleSelectBlur}
          className={cn(
            'aspect-square rounded-lg border-2 flex items-center justify-center transition-all',
            currentEffect.type === 'blur'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          )}
        >
          <Droplets className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Color presets */}
        {PRESET_COLORS.slice(0, 6).map((color) => (
          <button
            key={color}
            type="button"
            disabled={disabled || isLoading}
            onClick={() => handleSelectColor(color)}
            className={cn(
              'aspect-square rounded-lg border-2 transition-all',
              currentEffect.type === 'color' && currentEffect.value === color
                ? 'border-primary'
                : 'border-border hover:border-primary/50'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Blur amount slider */}
      {currentEffect.type === 'blur' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Blur Amount</Label>
          <Slider
            value={[blurAmount]}
            onValueChange={handleBlurAmountChange}
            min={5}
            max={30}
            step={1}
            disabled={disabled}
          />
        </div>
      )}

      {!modelReady && !isLoading && (
        <p className="text-xs text-muted-foreground">
          AI model will load when you select an effect
        </p>
      )}
    </div>
  );
}
