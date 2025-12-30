import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Droplets, ImagePlus, X } from 'lucide-react';
import { loadSegmentationModel, isModelLoaded, BackgroundEffect } from '@/lib/backgroundRemoval';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export default function VirtualBackgroundSelector({
  currentEffect,
  onEffectChange,
  disabled = false,
}: VirtualBackgroundSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [blurAmount, setBlurAmount] = useState(15);
  const [customImages, setCustomImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setModelReady(isModelLoaded());
    
    // Cleanup blob URLs on unmount
    return () => {
      customImages.forEach(url => URL.revokeObjectURL(url));
    };
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

  const handleSelectImage = (imageUrl: string) => {
    if (!modelReady) {
      handleLoadModel().then(() => {
        onEffectChange({ type: 'image', value: imageUrl });
      });
    } else {
      onEffectChange({ type: 'image', value: imageUrl });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setCustomImages(prev => [...prev, blobUrl]);
    handleSelectImage(blobUrl);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveCustomImage = (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    URL.revokeObjectURL(imageUrl);
    setCustomImages(prev => prev.filter(url => url !== imageUrl));
    
    // Reset to none if currently using this image
    if (currentEffect.type === 'image' && currentEffect.value === imageUrl) {
      onEffectChange({ type: 'none' });
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

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Options</Label>
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
          {PRESET_COLORS.map((color) => (
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
      </div>

      {/* Custom Images */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Custom Images</Label>
        <div className="grid grid-cols-4 gap-2">
          {/* Upload button */}
          <button
            type="button"
            disabled={disabled || isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-all"
          >
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Custom uploaded images */}
          {customImages.map((imageUrl) => (
            <div key={imageUrl} className="relative group">
              <button
                type="button"
                disabled={disabled || isLoading}
                onClick={() => handleSelectImage(imageUrl)}
                className={cn(
                  'aspect-square rounded-lg border-2 transition-all overflow-hidden w-full',
                  currentEffect.type === 'image' && currentEffect.value === imageUrl
                    ? 'border-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <img
                  src={imageUrl}
                  alt="Custom background"
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={(e) => handleRemoveCustomImage(imageUrl, e)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
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
