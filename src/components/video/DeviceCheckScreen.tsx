import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, Mic, Volume2, Check, X, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import VirtualBackgroundSelector from "./VirtualBackgroundSelector";
import { BackgroundEffect } from "@/lib/backgroundRemoval";

interface DeviceCheckScreenProps {
  onComplete: (devices: SelectedDevices) => void;
  onCancel: () => void;
}

export interface SelectedDevices {
  audioInputId?: string;
  videoInputId?: string;
  audioOutputId?: string;
  backgroundEffect?: BackgroundEffect;
}

interface DeviceStatus {
  camera: "pending" | "checking" | "success" | "error";
  microphone: "pending" | "checking" | "success" | "error";
  speaker: "pending" | "checking" | "success" | "error";
}

const DeviceCheckScreen = ({ onComplete, onCancel }: DeviceCheckScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [micLevel, setMicLevel] = useState(0);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    camera: "pending",
    microphone: "pending",
    speaker: "pending",
  });
  const [speakerTested, setSpeakerTested] = useState(false);
  const [backgroundEffect, setBackgroundEffect] = useState<BackgroundEffect>({ type: 'none' });

  // Enumerate devices
  const enumerateDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices(deviceList);

      // Auto-select first device of each type if not selected
      const cameras = deviceList.filter((d) => d.kind === "videoinput");
      const mics = deviceList.filter((d) => d.kind === "audioinput");
      const speakers = deviceList.filter((d) => d.kind === "audiooutput");

      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
      if (mics.length > 0 && !selectedMic) {
        setSelectedMic(mics[0].deviceId);
      }
      if (speakers.length > 0 && !selectedSpeaker) {
        setSelectedSpeaker(speakers[0].deviceId);
      }
    } catch (error) {
      console.error("Error enumerating devices:", error);
    }
  }, [selectedCamera, selectedMic, selectedSpeaker]);

  // Start camera and microphone
  const startMedia = useCallback(async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      setDeviceStatus((prev) => ({ ...prev, camera: "checking", microphone: "checking" }));

      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Setup video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setDeviceStatus((prev) => ({ ...prev, camera: "success" }));
      }

      // Setup audio analyzer for mic level
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start mic level animation
      const updateMicLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(Math.min(100, (average / 128) * 100));
        animationRef.current = requestAnimationFrame(updateMicLevel);
      };
      updateMicLevel();
      setDeviceStatus((prev) => ({ ...prev, microphone: "success" }));

      // Re-enumerate to get labels
      await enumerateDevices();
    } catch (error) {
      console.error("Error accessing media devices:", error);
      const isPermissionDenied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");

      if (isPermissionDenied) {
        toast.error("Camera and microphone access denied. Please allow access in your browser settings.");
      } else {
        toast.error("Failed to access camera or microphone");
      }

      setDeviceStatus((prev) => ({ ...prev, camera: "error", microphone: "error" }));
    }
  }, [selectedCamera, selectedMic, enumerateDevices]);

  // Play test sound for speaker
  const testSpeaker = useCallback(async () => {
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 500);

      setSpeakerTested(true);
      setDeviceStatus((prev) => ({ ...prev, speaker: "success" }));
      toast.success("Speaker test complete");
    } catch (error) {
      console.error("Error testing speaker:", error);
      toast.error("Failed to test speaker");
      setDeviceStatus((prev) => ({ ...prev, speaker: "error" }));
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    startMedia();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Restart media when device selection changes
  useEffect(() => {
    if (selectedCamera || selectedMic) {
      startMedia();
    }
  }, [selectedCamera, selectedMic]);

  const handleContinue = () => {
    // Cleanup streams before continuing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    onComplete({
      audioInputId: selectedMic || undefined,
      videoInputId: selectedCamera || undefined,
      audioOutputId: selectedSpeaker || undefined,
      backgroundEffect,
    });
  };

  const cameras = devices.filter((d) => d.kind === "videoinput");
  const mics = devices.filter((d) => d.kind === "audioinput");
  const speakers = devices.filter((d) => d.kind === "audiooutput");

  const allChecksPass =
    deviceStatus.camera === "success" && deviceStatus.microphone === "success" && speakerTested;

  const StatusIcon = ({ status }: { status: "pending" | "checking" | "success" | "error" }) => {
    switch (status) {
      case "checking":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "success":
        return <Check className="w-4 h-4 text-green-500" />;
      case "error":
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-muted" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-50">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Device Check</h1>
          <p className="text-muted-foreground">
            Make sure your camera, microphone, and speakers are working before joining the call.
          </p>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {deviceStatus.camera === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Camera access denied</p>
                <Button variant="outline" size="sm" onClick={startMedia} className="mt-2">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Virtual Background */}
        <div className="p-4 rounded-lg border bg-card">
          <VirtualBackgroundSelector
            currentEffect={backgroundEffect}
            onEffectChange={setBackgroundEffect}
          />
        </div>

        {/* Device Checks */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Camera */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-5 h-5 text-primary" />
              <span className="font-medium">Camera</span>
              <StatusIcon status={deviceStatus.camera} />
            </div>
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                {cameras.map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-5 h-5 text-primary" />
              <span className="font-medium">Microphone</span>
              <StatusIcon status={deviceStatus.microphone} />
            </div>
            <Select value={selectedMic} onValueChange={setSelectedMic}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {mics.map((mic) => (
                  <SelectItem key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mics.indexOf(mic) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Mic Level Meter */}
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-100",
                  micLevel > 50 ? "bg-green-500" : micLevel > 20 ? "bg-primary" : "bg-muted-foreground"
                )}
                style={{ width: `${micLevel}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Speak to test your microphone</p>
          </div>

          {/* Speaker */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-5 h-5 text-primary" />
              <span className="font-medium">Speaker</span>
              <StatusIcon status={deviceStatus.speaker} />
            </div>
            {speakers.length > 0 && (
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                <SelectTrigger className="w-full mb-2">
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent>
                  {speakers.map((speaker) => (
                    <SelectItem key={speaker.deviceId} value={speaker.deviceId}>
                      {speaker.label || `Speaker ${speakers.indexOf(speaker) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={testSpeaker}
              className="w-full"
            >
              {speakerTested ? "Test Again" : "Play Test Sound"}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!allChecksPass}>
            {allChecksPass ? "Join Call" : "Complete All Checks"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeviceCheckScreen;
