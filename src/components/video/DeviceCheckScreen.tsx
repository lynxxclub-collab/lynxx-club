import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, Mic, Volume2, Check, X, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import VirtualBackgroundSelector from "./VirtualBackgroundSelector";
import { BackgroundEffect, loadSegmentationModel, isModelLoaded, processFrameWithBackground } from "@/lib/backgroundRemoval";
import { getLastUsedBackground, setLastUsedBackground, addRecentBackground } from "@/lib/backgroundPreferences";
import { AnimationState, resetAnimationState } from "@/lib/animatedBackgrounds";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const bgProcessingRef = useRef<boolean>(false);
  const animationStateRef = useRef<AnimationState>({ frameCount: 0, time: 0 });

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
  const [isProcessingBackground, setIsProcessingBackground] = useState(false);

  // Load last used background on mount
  useEffect(() => {
    const lastUsed = getLastUsedBackground();
    if (lastUsed) {
      setBackgroundEffect(lastUsed);
    }
  }, []);

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

  // Background processing loop
  useEffect(() => {
    if (backgroundEffect.type === 'none' || !videoRef.current || !canvasRef.current) {
      bgProcessingRef.current = false;
      resetAnimationState();
      return;
    }

    const startProcessing = async () => {
      if (!isModelLoaded()) {
        setIsProcessingBackground(true);
        await loadSegmentationModel();
        setIsProcessingBackground(false);
      }

      bgProcessingRef.current = true;
      const startTime = performance.now();

      const processLoop = async () => {
        if (!bgProcessingRef.current || !videoRef.current || !canvasRef.current) return;

        // Update animation state
        animationStateRef.current = {
          frameCount: animationStateRef.current.frameCount + 1,
          time: performance.now() - startTime,
        };

        try {
          await processFrameWithBackground(
            videoRef.current,
            canvasRef.current,
            backgroundEffect,
            animationStateRef.current
          );
        } catch (error) {
          console.error('Background processing error:', error);
        }

        if (bgProcessingRef.current) {
          requestAnimationFrame(processLoop);
        }
      };

      processLoop();
    };

    startProcessing();

    return () => {
      bgProcessingRef.current = false;
    };
  }, [backgroundEffect]);

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
      bgProcessingRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {
          // Ignore errors when closing already closed context
        });
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

  const handleBackgroundChange = (effect: BackgroundEffect) => {
    setBackgroundEffect(effect);
    setLastUsedBackground(effect);
    if (effect.type !== 'none') {
      addRecentBackground(effect);
    }
  };

  const handleContinue = () => {
    // Cleanup streams before continuing
    bgProcessingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {
        // Ignore errors when closing already closed context
      });
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

  const showCanvas = backgroundEffect.type !== 'none' && !isProcessingBackground;

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
    <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="bg-blur-purple w-[400px] h-[400px] -top-48 -left-48 opacity-30" />
        <div className="bg-blur-rose w-[300px] h-[300px] -bottom-32 -right-32 opacity-20" />
      </div>

      <div className="max-w-2xl w-full space-y-4 sm:space-y-6 relative z-10 py-4 sm:py-0">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Device Check</h1>
          <p className="text-white/60 text-sm sm:text-base px-2">
            Make sure your camera, microphone, and speakers are working before joining.
          </p>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-video bg-white/[0.02] rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          {/* Hidden video element for processing */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "w-full h-full object-cover",
              showCanvas && "hidden"
            )}
          />
          
          {/* Canvas for processed background */}
          <canvas
            ref={canvasRef}
            className={cn(
              "w-full h-full object-cover",
              !showCanvas && "hidden"
            )}
          />

          {/* Loading overlay for background processing */}
          {isProcessingBackground && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-white">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm">Loading AI model...</span>
              </div>
            </div>
          )}

          {deviceStatus.camera === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center px-4">
                <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-white/40 mx-auto mb-2" />
                <p className="text-white/60 text-sm">Camera access denied</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={startMedia} 
                  className="mt-3 bg-white/10 border-white/20 text-white hover:bg-white/20 touch-target"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Virtual Background - Collapsible on mobile for better UX */}
        <div className="glass-card p-3 sm:p-4">
          <VirtualBackgroundSelector
            currentEffect={backgroundEffect}
            onEffectChange={handleBackgroundChange}
          />
        </div>

        {/* Device Checks - Stack on mobile, grid on larger screens */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Camera */}
          <div className="glass-card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-5 h-5 text-primary" />
              <span className="font-medium text-white text-sm sm:text-base">Camera</span>
              <StatusIcon status={deviceStatus.camera} />
            </div>
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-full bg-white/[0.05] border-white/10 text-white h-11 touch-target">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0f] border-white/10">
                {cameras.map((camera) => (
                  <SelectItem 
                    key={camera.deviceId} 
                    value={camera.deviceId}
                    className="text-white focus:bg-white/10 focus:text-white"
                  >
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Microphone */}
          <div className="glass-card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-5 h-5 text-primary" />
              <span className="font-medium text-white text-sm sm:text-base">Microphone</span>
              <StatusIcon status={deviceStatus.microphone} />
            </div>
            <Select value={selectedMic} onValueChange={setSelectedMic}>
              <SelectTrigger className="w-full bg-white/[0.05] border-white/10 text-white h-11 touch-target">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0f] border-white/10">
                {mics.map((mic) => (
                  <SelectItem 
                    key={mic.deviceId} 
                    value={mic.deviceId}
                    className="text-white focus:bg-white/10 focus:text-white"
                  >
                    {mic.label || `Microphone ${mics.indexOf(mic) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Mic Level Meter */}
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-100 rounded-full",
                  micLevel > 50 ? "bg-green-500" : micLevel > 20 ? "bg-primary" : "bg-white/30"
                )}
                style={{ width: `${micLevel}%` }}
              />
            </div>
            <p className="text-xs text-white/50 mt-1">Speak to test your mic</p>
          </div>

          {/* Speaker */}
          <div className="glass-card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-5 h-5 text-primary" />
              <span className="font-medium text-white text-sm sm:text-base">Speaker</span>
              <StatusIcon status={deviceStatus.speaker} />
            </div>
            {speakers.length > 0 && (
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                <SelectTrigger className="w-full bg-white/[0.05] border-white/10 text-white h-11 touch-target mb-2">
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0f] border-white/10">
                  {speakers.map((speaker) => (
                    <SelectItem 
                      key={speaker.deviceId} 
                      value={speaker.deviceId}
                      className="text-white focus:bg-white/10 focus:text-white"
                    >
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
              className="w-full bg-white/[0.05] border-white/20 text-white hover:bg-white/10 h-10 touch-target"
            >
              {speakerTested ? "Test Again" : "Play Test Sound"}
            </Button>
          </div>
        </div>

        {/* Actions - Larger touch targets on mobile */}
        <div className="flex gap-3 sm:gap-4 justify-center pt-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="bg-white/[0.05] border-white/20 text-white hover:bg-white/10 h-12 px-6 touch-target text-sm sm:text-base"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleContinue} 
            disabled={!allChecksPass}
            className="btn-gradient-rose h-12 px-6 touch-target text-sm sm:text-base disabled:opacity-50"
          >
            {allChecksPass ? "Join Call" : "Complete All Checks"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeviceCheckScreen;
