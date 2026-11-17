const sharp = require('sharp');
const path = require('path');

async function extractFeatures() {
    const inputPath = path.join(__dirname, 'segmented_object.jpg');
    console.log("Starting Step 6: Feature Extraction & Representation...");
    
    try {
        const { data, info } = await sharp(inputPath)
            .raw()
            .toBuffer({ resolveWithObject: true });
            
        let totalR = 0, totalG = 0, totalB = 0;
        let foregroundArea = 0;
        
        // Loop through all pixels in the segmented object to extract data
        for (let i = 0; i < data.length; i += info.channels) {
            const r = data[i];
            const g = data[i+1] || data[i]; // Handle grayscale if needed
            const b = data[i+2] || data[i];
            
            totalR += r;
            totalG += g;
            totalB += b;
            
            // Calculate Area (count pixels that aren't pure dark background)
            if ((r + g + b) / 3 > 30) {
                foregroundArea++;
            }
        }
        
        const totalPixels = info.width * info.height;
        const avgR = Math.round(totalR / totalPixels);
        const avgG = Math.round(totalG / totalPixels);
        const avgB = Math.round(totalB / totalPixels);
        const aspectRatio = (info.width / info.height).toFixed(2);
        const fillRatio = ((foregroundArea / totalPixels) * 100).toFixed(2);
        
        console.log("\n✅ Step 6 Complete! The image has been converted into numbers.");
        console.log("--- Extracted Feature Vector (Data for Machine Learning) ---");
        console.log(`[Feature 1 - Shape] Aspect Ratio:       ${aspectRatio} (Width/Height)`);
        console.log(`[Feature 2 - Shape] Total Pixels:       ${totalPixels}`);
        console.log(`[Feature 3 - Shape] Foreground Area:    ${foregroundArea}`);
        console.log(`[Feature 4 - Shape] Area Fill Ratio:    ${fillRatio}%`);
        console.log(`[Feature 5 - Color] Average Red Value:  ${avgR}`);
        console.log(`[Feature 6 - Color] Average Grn Value:  ${avgG}`);
        console.log(`[Feature 7 - Color] Average Blu Value:  ${avgB}`);
        console.log("------------------------------------------------------------");
        console.log("Instead of looking at a picture, an AI will now just look at this array of 7 numbers to guess what the object is!");
        
    } catch (error) {
        console.error("Failed to extract features:", error.message);
    }
}

extractFeatures();
