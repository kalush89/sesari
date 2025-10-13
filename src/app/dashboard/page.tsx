import { getAuthSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Dashboard() {
  const session = await getAuthSession()

  if (!session) {
    redirect("/signin")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Sesari Dashboard
            </h1>
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                User Information
              </h2>
              <div className="space-y-2">
                <p><strong>Name:</strong> {session.user?.name}</p>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>User ID:</strong> {session.user?.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}