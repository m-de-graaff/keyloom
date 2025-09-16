import { getSession } from '@keyloom/nextjs';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const { session, user } = await getSession();
  if (!session) redirect('/sign-in');

  async function logout() {
    'use server';
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (response.ok) {
      redirect('/sign-in');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Logout
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Welcome!</h2>
              <p className="text-gray-600">You are successfully authenticated.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium text-gray-700 mb-2">User Information:</h3>
              <pre className="text-sm text-gray-600">{user?.email}</pre>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium text-gray-700 mb-2">Session Information:</h3>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                {JSON.stringify({
                  sessionId: session?.id,
                  expiresAt: session?.expiresAt
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
