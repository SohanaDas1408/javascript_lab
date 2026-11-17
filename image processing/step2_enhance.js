const sharp = require('sharp');
const path = require('path');

async function enhanceImage() {
    const inputPath = path.join(__dirname, 'dark rainy image.jpg');
    const outputPath = path.join(__dirname, 'enhanced_image.jpg');
    
    console.log("Starting Step 2: Image Enhancement (Pre-processing)...");
    
    try {
        await sharp(inputPath)
            // Enhancement 1: Normalize contrast (stretches luminance to cover full dynamic range)
            .normalize()
            // Enhancement 2: Modulate to increase brightness since the original is "dark"
            .modulate({
                brightness: 1.4, // Increase brightness by 40%
                saturation: 1.2  // Boost saturation slightly by 20%
            })
            // Enhancement 3: Light sharpening to define rain/edges better
            .sharpen()
            .toFile(outputPath);
            
        console.log("✅ Step 2 Complete! Image has been enhanced.");
        console.log(`Saved enhanced output to: ${outputPath}`);
        console.log("Enhancements applied: Contrast Normalization, Brightness (+40%), Saturation (+20%), and Edge Sharpening.");
        
    } catch (error) {
        console.error("Failed to enhance image:", error.message);
    }
}

enhanceImage();
