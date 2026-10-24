import React from 'react';
import Link from 'next/link';
import connectDB from '@/lib/mongodb';
import Blog from '@/models/Blog';
import { getBlogImageSrc } from '@/lib/blogImage';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export const revalidate = 60;

const BLOGS_PAGE_LIMIT = 24;

// Removing animation keyframes
const styles = `
  .blog-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .blog-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
`;

const truncateContent = (content: string, maxLength: number = 150) => {
  const plainText = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return `${plainText.substring(0, maxLength)}...`;
};

const toIsoString = (value: unknown) => {
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

export default async function Blogs() {
  let blogs: BlogPost[] = [];
  let error: string | null = null;

  try {
    await connectDB();
    const posts = await Blog.find({}, 'title slug shortDescription imageUrl createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(BLOGS_PAGE_LIMIT)
      .lean<Array<Record<string, unknown>>>();

    blogs = posts.map((post) => {
      const id = String(post._id);
      const updatedAt = toIsoString(post.updatedAt || post.createdAt);

      return {
        id,
        title: String(post.title || ''),
        slug: String(post.slug || ''),
        shortDescription: post.shortDescription
          ? truncateContent(String(post.shortDescription), 220)
          : undefined,
        imageUrl: getBlogImageSrc(id, String(post.imageUrl || '/default-blog-image.jpg'), updatedAt),
        createdAt: toIsoString(post.createdAt),
        updatedAt,
      };
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'An error occurred while loading blog posts.';
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://d-solar.asia';
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'D-Solar Blog',
    description: 'Latest blog posts and insights about solar energy in the Philippines.',
    url: `${baseUrl}/blogs`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: blogs.map((blog, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${baseUrl}/blogs/${blog.slug}`,
        name: blog.title,
      })),
    },
  };
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      {/* Simple decorative elements instead of animations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top right decorative element */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-bl-full bg-blue-100/50"></div>
        
        {/* Bottom left decorative element */}
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-tr-full bg-orange-100/50"></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-primary inline-block border-b-4 border-orange-400 pb-2">
            Recent Blogs
          </h1>
        </div>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded my-4" role="alert">
            <p>{error}</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No blog posts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.map(blog => (
              <div key={blog.id} className="overflow-hidden rounded-lg shadow-md border border-gray-100 bg-white blog-card">
                <img 
                  src={blog.imageUrl} 
                  alt={blog.title} 
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2 text-primary">{blog.title}</h2>
                  <p className="text-gray-600 mb-4">{blog.shortDescription || ''}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {new Date(blog.createdAt).toLocaleDateString()}
                    </span>
                    <Link 
                      href={`/blogs/${blog.slug}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Read More
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add style tag for subtle animations */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </main>
  );
} 