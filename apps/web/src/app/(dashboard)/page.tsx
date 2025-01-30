"use client"

import { useState } from "react"
import { Mic, MicOff, Video, VideoOff, Users, MessageSquare } from "lucide-react"

export default function DashboardPage() {
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(false)

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
      {/* Channels List */}
      <div className="w-64 bg-muted/30 rounded-lg p-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Channels
        </h2>
        <div className="space-y-2">
          <div className="p-2 bg-background rounded-md cursor-pointer hover:bg-accent">
            General
          </div>
          <div className="p-2 bg-background rounded-md cursor-pointer hover:bg-accent">
            Gaming
          </div>
          <div className="p-2 bg-background rounded-md cursor-pointer hover:bg-accent">
            Music
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-muted/30 rounded-lg">
        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 p-4">
          <div className="bg-background rounded-lg aspect-video flex items-center justify-center">
            Your Video
          </div>
          <div className="bg-background rounded-lg aspect-video flex items-center justify-center">
            Participant 1
          </div>
          <div className="bg-background rounded-lg aspect-video flex items-center justify-center">
            Participant 2
          </div>
          <div className="bg-background rounded-lg aspect-video flex items-center justify-center">
            Participant 3
          </div>
        </div>

        {/* Controls */}
        <div className="h-20 border-t bg-background p-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full ${
              isMuted ? "bg-destructive" : "bg-primary"
            } text-white hover:opacity-90`}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </button>
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-4 rounded-full ${
              !isVideoOn ? "bg-destructive" : "bg-primary"
            } text-white hover:opacity-90`}
          >
            {isVideoOn ? <Video /> : <VideoOff />}
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="w-80 bg-muted/30 rounded-lg flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </h2>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="bg-background p-3 rounded-lg">
            <p className="text-sm font-medium">User 1</p>
            <p className="text-sm">Hello everyone!</p>
          </div>
          <div className="bg-background p-3 rounded-lg">
            <p className="text-sm font-medium">User 2</p>
            <p className="text-sm">Hi there!</p>
          </div>
        </div>
        <div className="p-4 border-t">
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full p-2 rounded-md bg-background"
          />
        </div>
      </div>
    </div>
  )
} 