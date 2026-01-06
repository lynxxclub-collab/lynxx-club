import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutModalProps {
  open: boolean;
  timeRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutModal({
  open,
  timeRemaining,
  onStayLoggedIn,
  onLogout,
}: SessionTimeoutModalProps) {
  // Calculate minutes and seconds
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-[400px]">
        <AlertDialogHeader>
          <div className="flex flex-col items-center gap-4 mb-2">
            {/* Animated Icon */}
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 animate-pulse">
              <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            
            <AlertDialogTitle className="text-xl text-center">
              Session Expiring Soon
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription className="text-base text-center pt-2">
            You've been inactive. To secure your account, you will be logged out in:
          </AlertDialogDescription>

          {/* Large Timer Display */}
          <div className="py-4 flex justify-center">
            <span className="font-mono text-4xl font-bold text-foreground tracking-wider bg-muted/50 px-4 py-2 rounded-lg">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-2">
          {/* Mobile First: Full width buttons stacked on mobile */}
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full sm:w-auto border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out Now
          </Button>
          <Button 
            onClick={onStayLoggedIn} 
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}