// Some blog images are stored in MongoDB as base64 data URLs. Embedding those
// directly in pages makes the HTML huge (and breaks Vercel's ISR size limit),
// so pages link to /blog-images/[id] instead, which serves the decoded image.

export const isDataImageUrl = (url: string) => url.startsWith('data:');

export const getBlogImageSrc = (id: string, imageUrl: string, updatedAt?: string) => {
  if (!isDataImageUrl(imageUrl)) {
    return imageUrl;
  }

  // The version param busts the CDN cache when the post (and its image) is edited.
  const version = updatedAt ? new Date(updatedAt).getTime() : NaN;
  return Number.isNaN(version) ? `/blog-images/${id}` : `/blog-images/${id}?v=${version}`;
};
