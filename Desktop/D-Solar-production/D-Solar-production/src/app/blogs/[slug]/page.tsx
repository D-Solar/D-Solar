import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import Blog from '@/models/Blog';
import { getBlogImageSrc } from '@/lib/blogImage';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  shortDescription?: string;
  imageUrl: string;
  author?: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface RelatedBlogPost {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  category?: string;
}

// Always render fresh: static generation previously let Vercel's edge permanently
// cache a 404 for a slug that didn't exist at build time, with no way to invalidate it.
export const dynamic = 'force-dynamic';

// Only render known blog slugs statically. Unknown slugs should 404 instead of being generated on demand.
export const dynamicParams = false;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sanitizeHref = (href: string) => {
  const trimmed = href.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return '#';
};

const convertMarkdownLinks = (text: string) => text.replace(
  /\[([^\]]+)\]\(([^)]+)\)/g,
  (_match, label: string, href: string) => {
    const safeLabel = escapeHtml(label);
    const safeHref = escapeHtml(sanitizeHref(href));
    return `<a href="${safeHref}" class="text-blue-600 hover:text-blue-800 underline">${safeLabel}</a>`;
  }
);

const convertPlainUrls = (text: string) => text.replace(
  /(?<!href="|src=")(https?:\/\/[^\s<>"]+)/g,
  (url) => {
    const safeUrl = escapeHtml(sanitizeHref(url));
    return `<a href="${safeUrl}" class="text-blue-600 hover:text-blue-800 underline break-all" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
  }
);

const renderContent = (content: string) => {
  const formattedContent = content
    .split('\n\n')
    .map((paragraph, idx) => {
      if (paragraph.startsWith('# ')) {
        return <h1 key={idx} className="text-3xl font-bold my-6">{paragraph.substring(2)}</h1>;
      }
      if (paragraph.startsWith('## ')) {
        return <h2 key={idx} className="text-2xl font-bold my-5">{paragraph.substring(3)}</h2>;
      }
      if (paragraph.startsWith('### ')) {
        return <h3 key={idx} className="text-xl font-bold my-4">{paragraph.substring(4)}</h3>;
      }

      if (paragraph.includes('\n- ')) {
        const listItems = paragraph.split('\n- ');
        const firstPart = listItems.shift();

        return (
          <div key={idx}>
            {firstPart && <p className="mb-4">{firstPart}</p>}
            <ul className="list-disc pl-6 mb-6">
              {listItems.map((item, itemIdx) => (
                <li key={itemIdx} className="mb-2">{item}</li>
              ))}
            </ul>
          </div>
        );
      }

      const formattedParagraph = convertPlainUrls(convertMarkdownLinks(paragraph))
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      return (
        <p
          key={idx}
          className="mb-6"
          dangerouslySetInnerHTML={{ __html: formattedParagraph }}
        />
      );
    });

  return <div className="prose prose-lg max-w-none">{formattedContent}</div>;
};

const toIsoString = (value: unknown) => {
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connectDB();

  const blogDoc = await Blog.findOne({ slug })
    .lean<Record<string, unknown> | null>();

  if (!blogDoc) {
    notFound();
  }

  const blogId = String(blogDoc._id);
  const blogUpdatedAt = toIsoString(blogDoc.updatedAt || blogDoc.createdAt);

  const blog: BlogPost = {
    id: blogId,
    title: String(blogDoc.title || ''),
    slug: String(blogDoc.slug || ''),
    content: String(blogDoc.content || ''),
    shortDescription: blogDoc.shortDescription ? String(blogDoc.shortDescription) : undefined,
    imageUrl: getBlogImageSrc(blogId, String(blogDoc.imageUrl || '/default-blog-image.jpg'), blogUpdatedAt),
    author: blogDoc.author ? String(blogDoc.author) : 'D-Solar Team',
    category: blogDoc.category ? String(blogDoc.category) : undefined,
    tags: Array.isArray(blogDoc.tags) ? blogDoc.tags.map((tag) => String(tag)) : [],
    createdAt: toIsoString(blogDoc.createdAt),
    updatedAt: blogUpdatedAt,
  };

  const relatedQuery: Array<Record<string, unknown>> = [];

  if (blog.category) {
    relatedQuery.push({ category: blog.category });
  }

  if (blog.tags && blog.tags.length > 0) {
    relatedQuery.push({ tags: { $in: blog.tags } });
  }

  let relatedPostsDocs: Array<Record<string, unknown>> = [];

  if (relatedQuery.length > 0) {
    relatedPostsDocs = await Blog.find(
      {
        _id: { $ne: blogDoc._id },
        $or: relatedQuery,
      },
      'title slug shortDescription category'
    )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(4)
      .lean<Array<Record<string, unknown>>>();
  }

  if (relatedPostsDocs.length < 3) {
    const excludedIds = [blogDoc._id, ...relatedPostsDocs.map((post) => post._id)].filter(Boolean);

    const fallbackPosts = await Blog.find(
      { _id: { $nin: excludedIds } },
      'title slug shortDescription category'
    )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(4 - relatedPostsDocs.length)
      .lean<Array<Record<string, unknown>>>();

    relatedPostsDocs = [...relatedPostsDocs, ...fallbackPosts];
  }

  const relatedPosts: RelatedBlogPost[] = relatedPostsDocs
    .filter((post) => post.slug)
    .map((post) => ({
      id: String(post._id),
      title: String(post.title || ''),
      slug: String(post.slug || ''),
      shortDescription: post.shortDescription ? String(post.shortDescription) : undefined,
      category: post.category ? String(post.category) : undefined,
    }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://d-solar.asia';
  const pageUrl = `${baseUrl}/blogs/${blog.slug}`;
  const wordCount = blog.content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.shortDescription || `Read about ${blog.title}`,
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt,
    author: {
      '@type': 'Organization',
      name: blog.author || 'D-Solar Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'D-Solar',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: pageUrl,
    image: [blog.imageUrl.startsWith('http') ? blog.imageUrl : `${baseUrl}${blog.imageUrl}`],
    keywords: blog.tags,
    articleSection: blog.category,
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blogs',
        item: `${baseUrl}/blogs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: blog.title,
        item: pageUrl,
      },
    ],
  };
  
  return (
    <main className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="container mx-auto px-4 py-16 mt-16">
        <Link href="/blogs" className="text-blue-600 hover:text-blue-800 mb-6 inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Blogs
        </Link>
        
        <article className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="w-full h-96 overflow-hidden">
            <img 
              src={blog.imageUrl} 
              alt={blog.title} 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="p-8">
            {blog.category && (
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">
                {blog.category}
              </span>
            )}
            
            <h1 className="text-4xl font-bold mb-4 text-gray-900">{blog.title}</h1>
            
            <div className="flex items-center mb-8">
              <img 
                src="/logo.png" 
                alt="Author" 
                className="w-12 h-12 rounded-full mr-4"
              />
              <div>
                <p className="text-gray-900 font-medium">{blog.author || 'D-Solar Team'}</p>
                <div className="flex space-x-1 text-sm text-gray-500">
                  <time dateTime={blog.createdAt}>
                    {new Date(blog.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </time>
                  {blog.updatedAt !== blog.createdAt && (
                    <span> (Updated: {new Date(blog.updatedAt).toLocaleDateString()})</span>
                  )}
                  <span> · {readMinutes} min read</span>
                </div>
              </div>
            </div>
            
            {renderContent(blog.content)}
            
            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {relatedPosts.length > 0 && (
              <section className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Related Articles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blogs/${post.slug}`}
                      className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                    >
                      {post.category && (
                        <span className="inline-block text-xs font-medium text-blue-700 bg-blue-100 rounded-full px-2 py-0.5 mb-2">
                          {post.category}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-gray-900 mb-1">{post.title}</p>
                      {post.shortDescription && (
                        <p className="text-sm text-gray-600 line-clamp-2">{post.shortDescription}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Share this article</h3>
              <div className="flex space-x-4">
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(pageUrl)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a 
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.7 3H4.3A1.3 1.3 0 003 4.3v15.4A1.3 1.3 0 004.3 21h15.4a1.3 1.3 0 001.3-1.3V4.3A1.3 1.3 0 0019.7 3zM8.339 18.338H5.667v-8.59h2.672v8.59zM7.004 8.574a1.548 1.548 0 11-.002-3.096 1.548 1.548 0 01.002 3.096zm11.335 9.764H15.67v-4.177c0-.996-.017-2.278-1.387-2.278-1.389 0-1.601 1.086-1.601 2.206v4.249h-2.667v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.779 3.203 4.092v4.711z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
} 