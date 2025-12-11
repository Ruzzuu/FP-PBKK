import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Reply {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
}

interface Post {
  id: number;
  title: string;
  content: string;
  published: boolean;
  fileUrl?: string;
  createdAt: string;
  authorId: number;
  author: {
    id: number;
    name: string;
    email: string;
  };
  replies: Reply[];
}

const PostDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingReply, setDeletingReply] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/posts/${id}`);
      setPost(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load post');
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      await api.delete(`/posts/${id}`);
      router.push('/posts');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete post');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      setSubmitting(true);
      await api.post(`/posts/${id}/reply`, { content: replyContent });
      setReplyContent('');
      fetchPost(); // Refresh to show new reply
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    try {
      setDeletingReply(replyId);
      await api.delete(`/posts/${id}/reply/${replyId}`);
      fetchPost(); // Refresh to remove deleted reply
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete reply');
    } finally {
      setDeletingReply(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8">Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !post) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-8 text-red-600">{error || 'Post not found'}</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const isAuthor = user?.id === post.authorId;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-4">
            <Link href="/posts" className="text-blue-500 hover:text-blue-600">
              ← Back to Posts
            </Link>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>
                <div className="flex items-center text-sm text-gray-500">
                  <span>By {post.author.name}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  {!post.published && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-yellow-600 font-medium">Draft</span>
                    </>
                  )}
                </div>
              </div>

              {isAuthor && (
                <div className="flex gap-2">
                  <Link
                    href={`/posts/${post.id}/edit`}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
            </div>

            {post.fileUrl && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Attached File:</h3>
                {post.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={`http://localhost:5000${post.fileUrl}`}
                        alt="Post attachment"
                        className="max-w-full h-auto rounded-lg shadow-lg border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                    <a
                      href={`http://localhost:5000${post.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open in new tab
                    </a>
                  </div>
                ) : (
                  <a
                    href={`http://localhost:5000${post.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    📎 View Attachment
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Replies Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Replies ({post.replies.length})
            </h2>

            {/* Reply Form */}
            <form onSubmit={handleReplySubmit} className="mb-6">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
            </form>

            {/* Replies List */}
            <div className="space-y-4">
              {post.replies.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No replies yet. Be the first!</p>
              ) : (
                post.replies.map((reply) => (
                  <div key={reply.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                          {reply.author.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{reply.author.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(reply.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      {user?.id === reply.author.id && (
                        <button
                          onClick={() => handleDeleteReply(reply.id)}
                          disabled={deletingReply === reply.id}
                          className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          title="Delete reply"
                        >
                          {deletingReply === reply.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 ml-10">{reply.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default PostDetail;
