// Array of filenames (without paths)
const imageFilenames = ['room02.JPG', 'room03.JPG'];

// Generate thumbnails with full paths
const imageThumbnails = imageFilenames.map((filename) => ({
  src: `/Images/thumbnails/${filename}`, // Assuming these images are in `public/images/thumbnails`
  type: 'image',
}));
