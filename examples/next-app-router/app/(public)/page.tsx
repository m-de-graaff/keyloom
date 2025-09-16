export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Welcome to Keyloom
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A modern authentication library for JavaScript applications
          </p>

          <div className="space-x-4">
            <a
              href="/sign-in"
              className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Sign In
            </a>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Go to Dashboard
            </a>
          </div>

          <div className="mt-12 text-sm text-gray-500">
            <p>
              Visit <a href="/debug" className="text-indigo-600 hover:text-indigo-800">/debug</a> to inspect session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
