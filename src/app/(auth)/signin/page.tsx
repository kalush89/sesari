import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';
import { SignInForm } from '@/components/auth/SignInForm';
import { AuthStatusIndicator } from '@/components/auth/AuthStatusIndicator';

export const metadata: Metadata = {
  title: 'Sign In - Sesari',
  description: 'Sign in to your Sesari account to track KPIs and manage objectives.',
};

export default async function SignInPage() {
  // Redirect if already authenticated
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900">Sesari</h1>
          <h2 className="mt-6 text-2xl font-medium text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Track your KPIs and achieve your objectives with AI-powered insights
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 border border-gray-200">
          <SignInForm />
          
          {/* Development status indicator */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <AuthStatusIndicator showDetails className="w-full justify-center" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}