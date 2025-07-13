# Image Compression System Documentation

## Overview

The photography portfolio implements an intelligent two-tier image compression system designed to optimize bandwidth usage while maintaining visual quality. This system ensures users never receive uncompressed original images, significantly improving page load times and reducing data consumption.

## System Architecture

### Compression Pipeline
```
Original Images (public/photography/)
    ↓ Sharp Processing
Two-Tier Compression
    ├── Thumbnails: 400×300px max, 60% quality, WebP
    └── Full Compressed: Original dimensions, 85% quality, WebP
    ↓ Progressive Loading
User Experience: Fast thumbnails → High-quality compressed on demand
```

### Storage Structure
```
public/
├── photography/                 # Original images (never served to users)
│   ├── content/
│   │   ├── Nature/
│   │   ├── Portrait/
│   │   └── City/
│   └── banner/
└── .pic/
    └── compressed/             # Generated compressed images
        ├── thumbnails/         # Thumbnail cache
        └── fullsize/          # Full-size compressed cache
```

## API Routes

### `/api/thumbnails/[...path].js`
Handles both thumbnail and full-size compression:

**Parameters:**
- `path`: Array of path segments to the original image
- `type`: `"thumbnail"` or `"fullsize"`

**Thumbnail Settings:**
- Max dimensions: 400×300px
- Quality: 60%
- Format: WebP
- Fit: Inside (maintains aspect ratio)

**Full-size Settings:**
- Dimensions: Original size maintained
- Quality: 85%
- Format: WebP

### URL Rewrite Rules (next.config.js)
```javascript
{
  source: '/.pic/thumb/:path*',
  destination: '/api/thumbnails/:path*?type=thumbnail'
},
{
  source: '/.pic/full/:path*', 
  destination: '/api/thumbnails/:path*?type=fullsize'
}
```

## Progressive Loading Implementation

### Component Integration

**Wall Component (`components/photo/Wall.js`):**
```javascript
// Thumbnail for initial display
const getThumbnailUrl = (originalPath) => {
  return originalPath.replace('/.pic/', '/.pic/thumb/')
}

// Full compressed for PhotoView lightbox
const getFullSizeUrl = (originalPath) => {
  return originalPath.replace('/.pic/', '/.pic/full/')
}

// Usage
<img src={getThumbnailUrl(item.path)} />
<PhotoView src={getFullSizeUrl(item.path)}>
```

**Banner Component (`components/photo/Banner.js`):**
- Carousel displays thumbnails for fast loading
- PhotoView opens full compressed images
- Preloading strategy for smooth user experience

## Caching Strategy

### Automatic Cache Management
- **Timestamp Validation**: Compressed images regenerate only when originals are newer
- **Directory Structure**: Maintains original folder hierarchy in cache
- **WebP Conversion**: All outputs converted to WebP for optimal compression
- **Long-term Caching**: 1-year cache headers for static compressed images

### Cache Locations
```
/.pic/compressed/
├── thumbnails/
│   └── photography/
│       ├── content/Nature/image1.webp
│       └── banner/1.webp
└── fullsize/
    └── photography/
        ├── content/Nature/image1.webp  
        └── banner/1.webp
```

## Performance Benefits

### Bandwidth Optimization
- **Thumbnail Phase**: ~80-90% size reduction from originals
- **Full-size Phase**: ~40-60% size reduction while maintaining quality
- **Format Efficiency**: WebP provides better compression than JPEG/PNG

### Loading Performance
1. **Initial Page Load**: Only thumbnails downloaded (~50KB each)
2. **Interactive Experience**: Full images load on-demand (~200-500KB each)
3. **Perceived Performance**: Instant thumbnail display with progressive enhancement

## Development Workflow

### Pre-generation Script
```bash
npm run compress-images
```

**Script Features (`scripts/generateCompressedImages.js`):**
- Scans entire `public/photography/` directory
- Generates both thumbnail and full-size variants
- Skips existing files that are up-to-date
- Maintains directory structure
- Progress reporting and statistics

### Runtime Generation
- Images compress automatically on first request
- Generated files cached for subsequent requests
- Fallback to original if compression fails

## Security Considerations

### Path Validation
```javascript
// Ensures paths stay within allowed directories
const publicDir = path.join(process.cwd(), 'public')
if (!originalPath.startsWith(publicDir)) {
  return res.status(403).json({ error: 'Access denied' })
}
```

### File Type Restrictions
- Only processes common image formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Validates file existence and type before processing
- Rejects directory traversal attempts

### Resource Limits
- Maximum thumbnail size: 400×300px
- Quality constraints: 60% thumbnails, 85% full-size
- Response size limit: 10MB per API call

## Monitoring and Debugging

### Logging
- Sharp processing errors logged with context
- File operations tracked for debugging
- Performance metrics available in server logs

### Error Handling
- Graceful fallback to original images if compression fails
- Proper HTTP status codes for different error scenarios
- Client-side loading states for better UX

## Browser Compatibility

### WebP Support
- **Modern Browsers**: Native WebP support provides optimal compression
- **Legacy Browsers**: Fallback mechanisms ensure compatibility
- **Progressive Enhancement**: System works regardless of format support

### Responsive Design
- Thumbnails scale appropriately across device sizes
- Full-size images adapt to viewport constraints
- Touch-friendly interactions on mobile devices

## Maintenance

### Cache Management
```bash
# Clear compressed image cache
rm -rf public/.pic/compressed/

# Regenerate all compressed images
npm run compress-images
```

### Storage Monitoring
- Monitor `public/.pic/compressed/` directory size
- Original images remain for backup and re-processing
- Implement cleanup strategies for old cached files if needed

## Future Enhancements

### Potential Improvements
- **Multiple Size Variants**: Generate medium-size options for different use cases
- **AVIF Support**: Next-generation format for even better compression
- **Smart Cropping**: AI-powered crop detection for better thumbnails
- **CDN Integration**: Distribute compressed images via CDN for global performance

This compression system provides a robust foundation for serving high-quality photography content efficiently while maintaining excellent user experience across all devices and network conditions.