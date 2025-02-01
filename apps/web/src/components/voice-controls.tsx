import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, LogOut } from "lucide-react";

interface VoiceControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onLeaveRoom: () => void;
}

export function VoiceControls({
  isMuted,
  isVideoOn,
  onToggleMute,
  onToggleVideo,
  onLeaveRoom,
}: VoiceControlsProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background border rounded-lg shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMute}
        className={isMuted ? "text-destructive" : "text-primary"}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleVideo}
        className={!isVideoOn ? "text-destructive" : "text-primary"}
      >
        {!isVideoOn ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </Button>

      <Button
        variant="destructive"
        size="icon"
        onClick={onLeaveRoom}
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
} 