import { User, Mic, MicOff, Phone, PhoneOff, Send } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RoomUser {
  id: string
  username: string
  isMuted: boolean
  isVideoOn: boolean
}

interface Message {
  id: string
  userId: string
  username: string
  text: string
  timestamp: Date
}

interface VoiceRoomViewProps {
  roomName: string
  users: RoomUser[]
  isInCall: boolean
  currentUserId: string
  messages: Message[]
  onJoinCall: () => void
  onLeaveCall: () => void
  onSendMessage: (text: string) => void
}

export function VoiceRoomView({ 
  roomName, 
  users, 
  isInCall, 
  currentUserId,
  messages,
  onJoinCall, 
  onLeaveCall,
  onSendMessage
}: VoiceRoomViewProps) {
  const [messageText, setMessageText] = useState("")

  // Separate current user and other users
  const currentUser = users.find(u => u.id === currentUserId)
  const otherUsers = users.filter(u => u.id !== currentUserId)

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageText.trim()) {
      onSendMessage(messageText)
      setMessageText("")
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Room name */}
      <h1 className="text-2xl font-bold mb-4 text-center">{roomName}</h1>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Avatars container */}
        <div className="flex justify-center items-center gap-8 mb-8 min-h-[200px]">
          {/* Current user avatar */}
          {currentUser && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className={`w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 ${isInCall ? 'border-green-500' : 'border-primary'} shadow-lg transition-all duration-300 hover:scale-110`}>
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
              </div>
              <div className="mt-2 font-medium text-center">
                {currentUser.username} (You)
              </div>
            </div>
          )}
          
          {/* Other users' avatars */}
          {otherUsers.map((user) => (
            <div key={user.id} className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-primary shadow-lg transition-all duration-300 hover:scale-110">
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
              </div>
              <div className="mt-2 font-medium text-center">
                {user.username}
              </div>
            </div>
          ))}
        </div>

        {/* Join/Leave call button */}
        <div className="flex justify-center mb-4">
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

        {/* Chat section */}
        <div className="flex-1 bg-background rounded-lg p-4 flex flex-col min-h-[200px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${
                  message.userId === currentUserId ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.userId === currentUserId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="font-medium text-sm mb-1">
                    {message.userId === currentUserId ? 'You' : message.username}
                  </div>
                  <div>{message.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Message input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
} 