import { User, Mic, MicOff, Phone, PhoneOff } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface RoomUser {
  id: string
  username: string
  isMuted: boolean
  isVideoOn: boolean
}

interface VoiceRoomViewProps {
  roomName: string
  users: RoomUser[]
  isInCall: boolean
  currentUserId: string
  onJoinCall: () => void
  onLeaveCall: () => void
}

export function VoiceRoomView({ 
  roomName, 
  users, 
  isInCall, 
  currentUserId,
  onJoinCall, 
  onLeaveCall 
}: VoiceRoomViewProps) {
  const [hoveredUser, setHoveredUser] = useState<string | null>(null)

  // Separate current user and other users
  const currentUser = users.find(u => u.id === currentUserId)
  const otherUsers = users.filter(u => u.id !== currentUserId)

  // Calculate positions in a circle
  const getPosition = (index: number, total: number) => {
    if (total === 1) return { top: '50%', left: '50%' }
    
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2 // Start from top
    const radius = total <= 3 ? 100 : 150 // Larger radius for better spacing
    const centerX = 50
    const centerY = 50
    
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    
    return {
      left: `${x}%`,
      top: `${y}%`
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Room name */}
      <h1 className="text-2xl font-bold mb-8">{roomName}</h1>

      {/* Avatars container */}
      <div className="relative w-[600px] h-[400px] flex items-center justify-center mb-8">
        {/* Current user avatar - only show when in call */}
        {isInCall && currentUser && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
            style={getPosition(0, otherUsers.length + 1)}
            onMouseEnter={() => setHoveredUser(currentUser.id)}
            onMouseLeave={() => setHoveredUser(null)}
          >
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-primary shadow-lg transition-transform group-hover:scale-110">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
              
              <div className="absolute -bottom-2 -right-2 flex gap-1">
                {currentUser.isMuted ? (
                  <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center shadow-md">
                    <MicOff className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              <div className={`absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-background px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg transition-opacity ${
                hoveredUser === currentUser.id ? 'opacity-100' : 'opacity-0'
              }`}>
                {currentUser.username} (You)
              </div>
            </div>
          </div>
        )}
        
        {/* Other users' avatars - always show */}
        {otherUsers.map((user, index) => {
          const position = getPosition(isInCall ? index + 1 : index, isInCall ? otherUsers.length + 1 : otherUsers.length)
          
          return (
            <div
              key={user.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
              style={position}
              onMouseEnter={() => setHoveredUser(user.id)}
              onMouseLeave={() => setHoveredUser(null)}
            >
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-primary shadow-lg transition-transform group-hover:scale-110">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
                
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  {user.isMuted ? (
                    <div className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center shadow-md">
                      <MicOff className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                      <Mic className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                
                <div className={`absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-background px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg transition-opacity ${
                  hoveredUser === user.id ? 'opacity-100' : 'opacity-0'
                }`}>
                  {user.username}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Join/Leave call button */}
      {isInCall ? (
        <Button 
          variant="destructive" 
          size="lg" 
          onClick={onLeaveCall}
          className="gap-2"
        >
          <PhoneOff className="w-5 h-5" />
          Leave Call
        </Button>
      ) : (
        <Button 
          variant="default" 
          size="lg" 
          onClick={onJoinCall}
          className="bg-green-500 hover:bg-green-600 gap-2"
        >
          <Phone className="w-5 h-5" />
          Join Call
        </Button>
      )}
    </div>
  )
} 