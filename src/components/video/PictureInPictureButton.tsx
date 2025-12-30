import { Button } from "@/components/ui/button";
import { PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PictureInPictureButtonProps {
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const PictureInPictureButton = ({ isActive, onClick, disabled }: PictureInPictureButtonProps) => {
  // Check if PiP is supported
  const isPiPSupported = "pictureInPictureEnabled" in document;

  if (!isPiPSupported) return null;

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={isActive ? "Exit picture-in-picture" : "Enter picture-in-picture"}
      className={cn(
        "rounded-full w-16 h-16 border-2 transition-colors",
        isActive
          ? "bg-primary/20 border-primary text-primary hover:bg-primary/30"
          : "bg-white/10 border-white/30 text-white hover:bg-white/20"
      )}
    >
      <PictureInPicture2 className="w-6 h-6" />
    </Button>
  );
};

export default PictureInPictureButton;
