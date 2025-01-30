import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Welcome to Vocario
        </h1>
        <p className="text-center mb-8">
          A modern real-time voice, video, and text communication platform
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  )
} 