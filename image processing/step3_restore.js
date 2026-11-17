const sharp = require('sharp');
const path = require('path');

async function restoreImage() {
    // We will use the enhanced image as our starting point for the pipeline
    const inputPath = path.join(__dirname, 'enhanced_image.jpg');
    const outputPath = path.join(__dirname, 'restored_image.jpg');
    
    console.log("Starting Step 3: Image Restoration...");
    
    try {
        await sharp(inputPath)
            // Restoration Technique: Median Filter
            // This calculates the median pixel value in a 3x3 grid across the whole image.
            // It is mathematically excellent at removing "salt-and-pepper" noise (random bright/dark pixels common in dark photography) 
            // without blurring the actual edges of objects.
            .median(3)
            .toFile(outputPath);
            
        console.log("✅ Step 3 Complete! Image has been mathematically restored.");
        console.log(`Saved restored output to: ${outputPath}`);
        console.log("Restoration applied: 3x3 Median Filter (Noise Reduction).");
        
    } catch (error) {
        console.error("Failed to restore image:", error.message);
    }
}

restoreImage();
