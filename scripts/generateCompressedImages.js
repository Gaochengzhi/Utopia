const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

// Generate compressed images for all photography content
async function generateCompressedImages() {
  const photographyDir = path.join(process.cwd(), 'public', 'photography')
  const compressedDir = path.join(process.cwd(), 'public', '.pic', 'compressed')
  
  // Ensure compressed directories exist
  const thumbnailDir = path.join(compressedDir, 'thumbnails')
  const fullsizeDir = path.join(compressedDir, 'fullsize')
  
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true })
  }
  if (!fs.existsSync(fullsizeDir)) {
    fs.mkdirSync(fullsizeDir, { recursive: true })
  }

  // Find all image files
  function findImageFiles(dir, baseDir = dir) {
    let files = []
    
    if (!fs.existsSync(dir)) {
      console.log(`Directory not found: ${dir}`)
      return files
    }
    
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        files.push(...findImageFiles(fullPath, baseDir))
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          const relativePath = path.relative(baseDir, fullPath)
          files.push({
            originalPath: fullPath,
            relativePath: relativePath
          })
        }
      }
    }
    
    return files
  }

  // Process single image
  async function processImage(file, type) {
    try {
      const { originalPath, relativePath } = file
      const nameWithoutExt = relativePath.replace(path.extname(relativePath), '')
      const outputDir = type === 'thumbnail' ? thumbnailDir : fullsizeDir
      const outputPath = path.join(outputDir, 'photography', `${nameWithoutExt}.webp`)
      
      // Ensure output directory exists
      const outputFileDir = path.dirname(outputPath)
      if (!fs.existsSync(outputFileDir)) {
        fs.mkdirSync(outputFileDir, { recursive: true })
      }
      
      // Check if compressed image already exists and is newer
      if (fs.existsSync(outputPath)) {
        const originalStat = fs.statSync(originalPath)
        const compressedStat = fs.statSync(outputPath)
        if (compressedStat.mtime >= originalStat.mtime) {
          console.log(`Skipping ${type} for ${relativePath} (already up to date)`)
          return
        }
      }
      
      let sharpInstance = sharp(originalPath)
      
      if (type === 'thumbnail') {
        // Thumbnail: resize to max 400x300, quality 60%
        sharpInstance = sharpInstance
          .resize(400, 300, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 60 })
      } else {
        // Fullsize: keep original dimensions, quality 85%
        sharpInstance = sharpInstance
          .webp({ quality: 85 })
      }
      
      await sharpInstance.toFile(outputPath)
      console.log(`Generated ${type}: ${relativePath}`)
      
    } catch (error) {
      console.error(`Error processing ${file.relativePath} (${type}):`, error.message)
    }
  }

  console.log('Starting compressed image generation...')
  
  // Find all image files
  const imageFiles = findImageFiles(photographyDir)
  console.log(`Found ${imageFiles.length} image files`)
  
  // Process thumbnails
  console.log('\nGenerating thumbnails...')
  for (const file of imageFiles) {
    await processImage(file, 'thumbnail')
  }
  
  // Process fullsize compressed images
  console.log('\nGenerating fullsize compressed images...')
  for (const file of imageFiles) {
    await processImage(file, 'fullsize')
  }
  
  console.log('\nCompressed image generation complete!')
  
  // Report statistics
  const thumbnailFiles = findImageFiles(thumbnailDir).length
  const fullsizeFiles = findImageFiles(fullsizeDir).length
  
  console.log(`\nStatistics:`)
  console.log(`Original images: ${imageFiles.length}`)
  console.log(`Thumbnails generated: ${thumbnailFiles}`)
  console.log(`Fullsize compressed generated: ${fullsizeFiles}`)
}

// Run the script
if (require.main === module) {
  generateCompressedImages().catch(console.error)
}

module.exports = { generateCompressedImages }