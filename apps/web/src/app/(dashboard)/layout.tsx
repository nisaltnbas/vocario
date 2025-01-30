"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, Settings, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (!session) {
        router.push("/login")
        return
      }
    } catch (error) {
      console.error("Error checking auth:", error)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-20 bg-muted flex flex-col items-center py-4">
        <div className="flex-1 flex flex-col items-center gap-4">
          <button className="p-3 rounded-lg bg-primary text-white">
            <Home className="h-6 w-6" />
          </button>
          <button className="p-3 rounded-lg hover:bg-accent">
            <Settings className="h-6 w-6" />
          </button>
        </div>
        <button 
          onClick={handleLogout}
          className="p-3 rounded-lg hover:bg-destructive/10 text-destructive"
        >
          <LogOut className="h-6 w-6" />
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background p-4">
        {children}
      </main>
    </div>
  )
} 