const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function compressImage() {
    console.log("Starting Step 8: Image Compression...\n");
    
    // We will compress the original image to demonstrate file size reduction
    const inputPath = path.join(__dirname, 'dark rainy image.jpg');
    const outputPath = path.join(__dirname, 'compressed_image.webp');
    
    try {
        // 1. Calculate original file size
        const originalStats = fs.statSync(inputPath);
        const originalSizeKB = (originalStats.size / 1024).toFixed(2);
        
        // 2. Compress the image
        // We are converting it to WebP (a highly efficient, modern compression format) 
        // and dropping the quality to 40% to force a noticeable reduction in storage size.
        await sharp(inputPath)
            .webp({ quality: 40 })
            .toFile(outputPath);
            
        // 3. Calculate new file size
        const compressedStats = fs.statSync(outputPath);
        const compressedSizeKB = (compressedStats.size / 1024).toFixed(2);
        
        // 4. Calculate savings
        const savedPercentage = (((originalStats.size - compressedStats.size) / originalStats.size) * 100).toFixed(2);
        
        console.log("✅ Step 8 Complete! Image successfully compressed.");
        console.log("==========================================");
        console.log(`Original Size:   ${originalSizeKB} KB (JPEG format)`);
        console.log(`Compressed Size: ${compressedSizeKB} KB (WebP format)`);
        console.log(`Storage Saved:   ${savedPercentage}%`);
        console.log("==========================================");
        console.log(`Saved compressed file to: ${outputPath}`);
        console.log("The image is now highly optimized for fast internet transmission or database storage!");
        
    } catch (error) {
        console.error("Failed to compress image:", error.message);
    }
}

compressImage();
