import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/layout';
import { AuthErrorDisplay } from '@/components/auth/AuthErrorDisplay';

export const metadata: Metadata = {
  title: 'Authentication Error - Sesari',
  description: 'An error occurred during authentication.',
};

export default function AuthErrorPage() {
  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Sesari</h1>
        <h2 className="mt-6 text-2xl font-medium text-gray-900">
          Authentication Error
        </h2>
      </div>

      <div className="bg-white py-8 px-4 shadow-sm rounded-lg sm:px-10 border border-gray-200">
        <Suspense fallback={
          <div className="text-center">
            <p className="text-gray-600">Loading error details...</p>
          </div>
        }>
          <AuthErrorDisplay />
        </Suspense>
        
        <div className="mt-6 text-center">
          <Link 
            href="/signin"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Try signing in again
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}