import { Metadata } from 'next';
import connectDB from '@/lib/mongodb';
import Blog from '@/models/Blog';
import { getBlogImageSrc } from '@/lib/blogImage';

interface BlogPost {
  _id: unknown;
  title: string;
  shortDescription: string;
  content: string;
  imageUrl: string;
  author: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

const trimDescription = (text: string, maxLength = 158) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://d-solar.asia');
  const { slug } = await params;

  try {
    await connectDB();
    const blog = await Blog.findOne({ slug }).lean<BlogPost | null>();

    if (!blog) {
      return {
        title: 'Blog Post | D-Solar',
        description: 'Read our latest blog post',
      };
    }

    const title = `${blog.title} | D-Solar Philippines`;
    const description = trimDescription(
      blog.shortDescription || `Read about ${blog.title} and practical solar insights for homes and businesses in the Philippines.`
    );
    const imageSrc = blog.imageUrl
      ? getBlogImageSrc(String(blog._id), blog.imageUrl, blog.updatedAt)
      : '/images/default-blog.jpg';
    const imageUrl = imageSrc.startsWith('/') ? `${baseUrl}${imageSrc}` : imageSrc;
    const seoKeywords = [
      ...(blog.tags || []),
      blog.category,
      'solar philippines',
      'solar panel installation philippines',
      'net metering philippines',
    ].filter(Boolean);

    // Prepare meta tags
    return {
      title,
      description,
      keywords: seoKeywords,
      category: blog.category,
      authors: [{ name: blog.author || 'D-Solar Team' }],
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        title,
        description,
        url: `${baseUrl}/blogs/${slug}`,
        siteName: 'D-Solar',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: blog.title,
          },
        ],
        locale: 'en_US',
        type: 'article',
        publishedTime: blog.createdAt,
        tags: blog.tags,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `${baseUrl}/blogs/${slug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Blog Post | D-Solar',
      description: 'Read our latest blog post',
    };
  }
} 