const sharp = require('sharp');
const path = require('path');

async function acquireImage() {
    const imagePath = path.join(__dirname, 'dark rainy image.jpg');
    console.log("Starting Step 1: Image Acquisition...");
    
    try {
        // "Acquiring" the image by loading it into the Sharp image processing pipeline
        const image = sharp(imagePath);
        
        // Extracting the digital metadata that the computer reads
        const metadata = await image.metadata();
        
        console.log("\n✅ Image successfully acquired into memory!");
        console.log("--- Acquired Image Properties ---");
        console.log(`Format:       ${metadata.format}`);
        console.log(`Dimensions:   ${metadata.width} x ${metadata.height} pixels`);
        console.log(`Color Space:  ${metadata.space}`);
        console.log(`Channels:     ${metadata.channels}`);
        console.log("---------------------------------");
        console.log("The image is now digitized in our program and ready for Step 2 (Enhancement/Pre-processing)!");
        
    } catch (error) {
        console.error("Failed to acquire image:", error.message);
    }
}

acquireImage();
