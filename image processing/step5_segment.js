const sharp = require('sharp');
const path = require('path');

async function segmentImage() {
    const binaryPath = path.join(__dirname, 'morphological_image.jpg');
    const originalPath = path.join(__dirname, 'restored_image.jpg'); // We'll extract from the restored color image
    const outputPath = path.join(__dirname, 'segmented_object.jpg');
    
    console.log("Starting Step 5: Image Segmentation...");
    
    try {
        // 1. Read the binary image to find where the "objects" are (the white pixels)
        const { data, info } = await sharp(binaryPath)
            .raw()
            .toBuffer({ resolveWithObject: true });
            
        let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
        let foundObject = false;
        
        // 2. Scan the grid to find the absolute boundaries of the foreground object(s)
        for (let y = 0; y < info.height; y++) {
            for (let x = 0; x < info.width; x++) {
                const idx = (y * info.width + x) * info.channels;
                const pixelValue = data[idx];
                
                // If it's a white pixel, it belongs to the foreground object
                if (pixelValue > 128) {
                    foundObject = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        
        if (foundObject && (maxX > minX) && (maxY > minY)) {
            const width = maxX - minX;
            const height = maxY - minY;
            
            console.log(`Primary foreground region detected!`);
            console.log(`Bounding Box Coordinates: [X: ${minX}, Y: ${minY}], [Width: ${width}px, Height: ${height}px]`);
            
            // 3. Segment the image by literally cutting (cropping) the detected object out of the original image
            await sharp(originalPath)
                .extract({ left: minX, top: minY, width: width, height: height })
                .toFile(outputPath);
                
            console.log("✅ Step 5 Complete! Object successfully segmented (separated from the background).");
            console.log(`Saved segmented output to: ${outputPath}`);
        } else {
            console.log("No clear foreground objects found. The image may be entirely black.");
        }
        
    } catch (error) {
        console.error("Failed to segment image:", error.message);
    }
}

segmentImage();
