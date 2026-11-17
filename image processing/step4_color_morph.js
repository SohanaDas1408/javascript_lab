const sharp = require('sharp');
const path = require('path');

async function morphologicalColorProcessing() {
    const inputPath = path.join(__dirname, 'restored_image.jpg');
    const outputPath = path.join(__dirname, 'morphological_image.jpg');
    
    console.log("Starting Step 4: Color & Morphological Processing...");
    
    try {
        await sharp(inputPath)
            // 1. Color Processing: Strip all color data to focus purely on shape and light intensity
            .grayscale()
            
            // 2. Morphological Pre-processing (Binary Thresholding):
            // Convert the grayscale image into a pure black and white (binary) image.
            // Any pixel lighter than 128 becomes pure white; darker becomes pure black.
            // This destroys the remaining texture and isolates the stark boundaries/silhouettes of objects.
            .threshold(128)
            
            .toFile(outputPath);
            
        console.log("✅ Step 4 Complete! Image colors stripped and binary shapes isolated.");
        console.log(`Saved output to: ${outputPath}`);
        console.log("Processing applied: Grayscale Conversion + Binary Thresholding.");
        
    } catch (error) {
        console.error("Failed to process image:", error.message);
    }
}

morphologicalColorProcessing();
