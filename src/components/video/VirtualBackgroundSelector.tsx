import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Droplets, ImagePlus, X, Heart } from 'lucide-react';
import { loadSegmentationModel, isModelLoaded, BackgroundEffect } from '@/lib/backgroundRemoval';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getFavoriteBackgrounds,
  getRecentBackgrounds,
  addFavoriteBackground,
  removeFavoriteBackground,
  isFavorite,
  getCustomImages,
  saveCustomImage,
  removeCustomImage,
  fileToBase64,
  addRecentBackground,
} from '@/lib/backgroundPreferences';
import { ANIMATION_PRESETS, AnimationType } from '@/lib/animatedBackgrounds';
import AnimatedBackgroundPreview from './AnimatedBackgroundPreview';

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
  const [favorites, setFavorites] = useState<BackgroundEffect[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<BackgroundEffect[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved preferences on mount
  useEffect(() => {
    setModelReady(isModelLoaded());
    setFavorites(getFavoriteBackgrounds());
    setRecentlyUsed(getRecentBackgrounds());
    setCustomImages(getCustomImages());
  }, []);

  const handleLoadModel = async () => {
    setIsLoading(true);
    const success = await loadSegmentationModel();
    setModelReady(success);
    setIsLoading(false);
  };

  const applyEffect = (effect: BackgroundEffect) => {
    onEffectChange(effect);
    if (effect.type !== 'none') {
      addRecentBackground(effect);
      setRecentlyUsed(getRecentBackgrounds());
    }
  };

  const handleSelectNone = () => {
    applyEffect({ type: 'none' });
  };

  const handleSelectBlur = () => {
    const effect: BackgroundEffect = { type: 'blur', blurAmount };
    if (!modelReady) {
      handleLoadModel().then(() => applyEffect(effect));
    } else {
      applyEffect(effect);
    }
  };

  const handleSelectColor = (color: string) => {
    const effect: BackgroundEffect = { type: 'color', value: color };
    if (!modelReady) {
      handleLoadModel().then(() => applyEffect(effect));
    } else {
      applyEffect(effect);
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    const effect: BackgroundEffect = { type: 'image', value: imageUrl };
    if (!modelReady) {
      handleLoadModel().then(() => applyEffect(effect));
    } else {
      applyEffect(effect);
    }
  };

  const handleSelectAnimated = (animationType: AnimationType) => {
    const effect: BackgroundEffect = { type: 'animated', animationType };
    if (!modelReady) {
      handleLoadModel().then(() => applyEffect(effect));
    } else {
      applyEffect(effect);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      const base64 = await fileToBase64(file);
      const saved = saveCustomImage(base64);
      
      if (!saved) {
        toast.error('Maximum 5 custom images allowed');
        return;
      }
      
      setCustomImages(getCustomImages());
      handleSelectImage(base64);
    } catch {
      toast.error('Failed to process image');
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveCustomImage = (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomImage(imageUrl);
    setCustomImages(getCustomImages());
    
    // Reset to none if currently using this image
    if (currentEffect.type === 'image' && currentEffect.value === imageUrl) {
      applyEffect({ type: 'none' });
    }
  };

  const handleBlurAmountChange = (value: number[]) => {
    setBlurAmount(value[0]);
    if (currentEffect.type === 'blur') {
      applyEffect({ type: 'blur', blurAmount: value[0] });
    }
  };

  const toggleFavorite = (effect: BackgroundEffect, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite(effect)) {
      removeFavoriteBackground(effect);
    } else {
      addFavoriteBackground(effect);
    }
    setFavorites(getFavoriteBackgrounds());
  };

  const getEffectKey = (effect: BackgroundEffect): string => {
    if (effect.type === 'none') return 'none';
    if (effect.type === 'blur') return `blur-${effect.blurAmount}`;
    if (effect.type === 'color') return `color-${effect.value}`;
    if (effect.type === 'image') return `image-${effect.value?.slice(0, 50)}`;
    if (effect.type === 'animated') return `animated-${effect.animationType}`;
    return 'unknown';
  };

  const renderEffectButton = (effect: BackgroundEffect, showFavorite = true) => {
    const isSelected = 
      currentEffect.type === effect.type &&
      currentEffect.value === effect.value &&
      currentEffect.animationType === effect.animationType;

    return (
      <div key={getEffectKey(effect)} className="relative group">
        <button
          type="button"
          disabled={disabled || isLoading}
          onClick={() => {
            if (effect.type === 'blur') handleSelectBlur();
            else if (effect.type === 'color') handleSelectColor(effect.value!);
            else if (effect.type === 'image') handleSelectImage(effect.value!);
            else if (effect.type === 'animated') handleSelectAnimated(effect.animationType!);
          }}
          className={cn(
            'aspect-square rounded-lg border-2 transition-all overflow-hidden w-full',
            isSelected ? 'border-primary' : 'border-border hover:border-primary/50'
          )}
        >
          {effect.type === 'blur' && (
            <div className="w-full h-full flex items-center justify-center bg-muted/50">
              <Droplets className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          {effect.type === 'color' && (
            <div className="w-full h-full" style={{ backgroundColor: effect.value }} />
          )}
          {effect.type === 'image' && (
            <img src={effect.value} alt="Background" className="w-full h-full object-cover" />
          )}
          {effect.type === 'animated' && (
            <AnimatedBackgroundPreview type={effect.animationType!} />
          )}
        </button>
        {showFavorite && effect.type !== 'none' && (
          <button
            type="button"
            onClick={(e) => toggleFavorite(effect, e)}
            className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center transition-opacity',
              isFavorite(effect) 
                ? 'bg-primary text-primary-foreground opacity-100' 
                : 'bg-muted text-muted-foreground opacity-0 group-hover:opacity-100'
            )}
          >
            <Heart className={cn('w-3 h-3', isFavorite(effect) && 'fill-current')} />
          </button>
        )}
      </div>
    );
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

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Heart className="w-3 h-3" /> Favorites
          </Label>
          <div className="grid grid-cols-6 gap-2">
            {favorites.map(effect => renderEffectButton(effect, false))}
          </div>
        </div>
      )}

      {/* Recently Used */}
      {recentlyUsed.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Recently Used</Label>
          <div className="grid grid-cols-6 gap-2">
            {recentlyUsed.slice(0, 5).map(effect => renderEffectButton(effect))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Options</Label>
        <div className="grid grid-cols-8 gap-2">
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
            <div key={color} className="relative group">
              <button
                type="button"
                disabled={disabled || isLoading}
                onClick={() => handleSelectColor(color)}
                className={cn(
                  'aspect-square rounded-lg border-2 transition-all w-full',
                  currentEffect.type === 'color' && currentEffect.value === color
                    ? 'border-primary'
                    : 'border-border hover:border-primary/50'
                )}
                style={{ backgroundColor: color }}
              />
              <button
                type="button"
                onClick={(e) => toggleFavorite({ type: 'color', value: color }, e)}
                className={cn(
                  'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center transition-opacity',
                  isFavorite({ type: 'color', value: color })
                    ? 'bg-primary text-primary-foreground opacity-100'
                    : 'bg-muted text-muted-foreground opacity-0 group-hover:opacity-100'
                )}
              >
                <Heart className={cn('w-3 h-3', isFavorite({ type: 'color', value: color }) && 'fill-current')} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Animated Backgrounds */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Animated</Label>
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(ANIMATION_PRESETS) as AnimationType[]).map((type) => (
            <div key={type} className="relative group">
              <button
                type="button"
                disabled={disabled || isLoading}
                onClick={() => handleSelectAnimated(type)}
                className={cn(
                  'aspect-square rounded-lg border-2 transition-all overflow-hidden w-full relative',
                  currentEffect.type === 'animated' && currentEffect.animationType === type
                    ? 'border-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <AnimatedBackgroundPreview type={type} />
                <span className="absolute bottom-0 inset-x-0 text-[9px] text-white bg-black/50 text-center py-0.5">
                  {ANIMATION_PRESETS[type].name}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => toggleFavorite({ type: 'animated', animationType: type }, e)}
                className={cn(
                  'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center transition-opacity',
                  isFavorite({ type: 'animated', animationType: type })
                    ? 'bg-primary text-primary-foreground opacity-100'
                    : 'bg-muted text-muted-foreground opacity-0 group-hover:opacity-100'
                )}
              >
                <Heart className={cn('w-3 h-3', isFavorite({ type: 'animated', animationType: type }) && 'fill-current')} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Images */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Custom Images</Label>
        <div className="grid grid-cols-6 gap-2">
          {/* Upload button */}
          <button
            type="button"
            disabled={disabled || isLoading || customImages.length >= 5}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'aspect-square rounded-lg border-2 border-dashed flex items-center justify-center transition-all',
              customImages.length >= 5
                ? 'border-muted cursor-not-allowed opacity-50'
                : 'border-border hover:border-primary/50'
            )}
            title={customImages.length >= 5 ? 'Maximum 5 custom images' : 'Upload image'}
          >
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Custom uploaded images */}
          {customImages.map((imageUrl) => (
            <div key={imageUrl.slice(0, 50)} className="relative group">
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
