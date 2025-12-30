import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Circle, Shield, AlertTriangle } from "lucide-react";

interface RecordingConsentModalProps {
  open: boolean;
  onConsent: (consent: boolean) => void;
  otherPersonName: string;
  otherPersonConsented: boolean | null;
}

const RecordingConsentModal = ({
  open,
  onConsent,
  otherPersonName,
  otherPersonConsented,
}: RecordingConsentModalProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <Circle className="w-6 h-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Recording Consent</DialogTitle>
          <DialogDescription className="text-center">
            This video date can be recorded for your records. Both participants must consent for recording to begin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
            <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Privacy Protection</p>
              <p className="text-muted-foreground">
                Recordings are securely stored and only accessible to participants. They will be automatically deleted
                after 30 days.
              </p>
            </div>
          </div>

          {otherPersonConsented !== null && (
            <div
              className={`flex items-start gap-3 p-3 rounded-lg ${
                otherPersonConsented ? "bg-green-500/10" : "bg-destructive/10"
              }`}
            >
              {otherPersonConsented ? (
                <Circle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              )}
              <div className="text-sm">
                <p className="font-medium">
                  {otherPersonName} has {otherPersonConsented ? "consented" : "declined"} recording
                </p>
                {!otherPersonConsented && (
                  <p className="text-muted-foreground">
                    Recording will not be available for this call since both parties must consent.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onConsent(false)} className="w-full sm:w-auto">
            Decline Recording
          </Button>
          <Button onClick={() => onConsent(true)} className="w-full sm:w-auto">
            I Consent to Recording
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordingConsentModal;
