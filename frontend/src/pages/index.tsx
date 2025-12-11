import React from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/posts');
    }
  }, [isAuthenticated, router]);

  return (
    <Layout>
      <div className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome to Task Manager
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A modern full-stack application built with NestJS and Next.js
        </p>
        <div className="space-x-4">
          <button
            onClick={() => router.push('/register')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-md text-lg font-medium"
          >
            Get Started
          </button>
          <button
            onClick={() => router.push('/login')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-3 rounded-md text-lg font-medium"
          >
            Login
          </button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-2">Secure Authentication</h3>
            <p className="text-gray-600">
              JWT-based authentication with refresh tokens for maximum security
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-2">Post Management</h3>
            <p className="text-gray-600">
              Create, read, update, and delete posts with ease
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-2">Replies & Comments</h3>
            <p className="text-gray-600">
              Engage with others by adding replies to posts
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
