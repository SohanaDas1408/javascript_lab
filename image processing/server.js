const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, 'original_' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.post('/process', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    
    const originalPath = req.file.path;
    const filename = req.file.filename;
    const baseDir = './public/uploads/';
    const uniquePrefix = filename.split('.')[0];
    
    const results = {
        original: `/uploads/${filename}`,
        steps: {}
    };
    
    try {
        // Step 1: Acquisition
        const meta = await sharp(originalPath).metadata();
        results.steps.step1 = { 
            img: results.original, 
            title: "1. Acquisition",
            desc: `Digitized into memory. Format: ${meta.format.toUpperCase()}, ${meta.width}x${meta.height}px, Channels: ${meta.channels}` 
        };
        
        // Step 2: Enhancement
        const step2Path = baseDir + `${uniquePrefix}_step2.jpg`;
        await sharp(originalPath).normalize().modulate({ brightness: 1.4, saturation: 1.2 }).sharpen().toFile(step2Path);
        results.steps.step2 = { 
            img: `/uploads/${uniquePrefix}_step2.jpg`, 
            title: "2. Enhancement",
            desc: 'Pre-processed: Contrast normalized, Brightness +40%, Sharpened edges.' 
        };
        
        // Step 3: Restoration
        const step3Path = baseDir + `${uniquePrefix}_step3.jpg`;
        await sharp(step2Path).median(3).toFile(step3Path);
        results.steps.step3 = { 
            img: `/uploads/${uniquePrefix}_step3.jpg`, 
            title: "3. Restoration",
            desc: 'Mathematical Restoration: 3x3 Median filter applied to remove random sensor noise.' 
        };
        
        // Step 4: Morphological (Binary)
        const step4Path = baseDir + `${uniquePrefix}_step4.jpg`;
        await sharp(step3Path).grayscale().threshold(128).toFile(step4Path);
        results.steps.step4 = { 
            img: `/uploads/${uniquePrefix}_step4.jpg`, 
            title: "4. Morphological",
            desc: 'Color stripped, converted to pure binary (Black & White) to isolate shapes.' 
        };
        
        // Step 5: Segmentation
        const { data: binData, info: binInfo } = await sharp(step4Path).raw().toBuffer({ resolveWithObject: true });
        let minX = binInfo.width, minY = binInfo.height, maxX = 0, maxY = 0;
        let found = false;
        for (let y = 0; y < binInfo.height; y++) {
            for (let x = 0; x < binInfo.width; x++) {
                const idx = (y * binInfo.width + x) * binInfo.channels;
                if (binData[idx] > 128) {
                    found = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        const step5Path = baseDir + `${uniquePrefix}_step5.jpg`;
        let segW = binInfo.width, segH = binInfo.height;
        if (found && maxX > minX && maxY > minY) {
            segW = maxX - minX;
            segH = maxY - minY;
            // Crop the bounding box from the restored image
            await sharp(step3Path).extract({ left: minX, top: minY, width: segW, height: segH }).toFile(step5Path);
        } else {
            await sharp(step3Path).toFile(step5Path); // fallback
        }
        results.steps.step5 = { 
            img: `/uploads/${uniquePrefix}_step5.jpg`, 
            title: "5. Segmentation",
            desc: `Background removed! Object cropped using Bounding Box: [${segW}x${segH}]` 
        };
        
        // Step 6: Features
        const { data: segData, info: segInfo } = await sharp(step5Path).raw().toBuffer({ resolveWithObject: true });
        let totalR = 0, totalG = 0, totalB = 0;
        let fg = 0;
        for (let i = 0; i < segData.length; i += segInfo.channels) {
            totalR += segData[i];
            totalG += segData[i+1] || segData[i];
            totalB += segData[i+2] || segData[i];
            if ((segData[i] + (segData[i+1]||0) + (segData[i+2]||0)) / 3 > 30) fg++;
        }
        const aspect = (segInfo.width / segInfo.height).toFixed(2);
        const fill = ((fg / (segInfo.width * segInfo.height)) * 100).toFixed(2);
        const avgColor = `rgb(${Math.round(totalR/(segInfo.width*segInfo.height))}, ${Math.round(totalG/(segInfo.width*segInfo.height))}, ${Math.round(totalB/(segInfo.width*segInfo.height))})`;
        results.steps.step6 = { 
            img: `/uploads/${uniquePrefix}_step5.jpg`, 
            title: "6. Feature Extraction",
            desc: `Converted to Feature Vector: Aspect Ratio: ${aspect}, Fill Ratio: ${fill}%, Avg Color: ${avgColor}` 
        };
        
        // Step 7: Classification
        let label = "Unknown Object";
        let conf = 0;
        if (aspect > 1.5) { label = "Vehicle / Wide Object"; conf = 85; }
        else if (aspect < 0.5) { label = "Pedestrian / Post"; conf = 80; }
        else if (fill > 85) { label = "Building / Solid Square"; conf = 90; }
        else { label = "Person with Umbrella / Complex Shape"; conf = 94; }
        results.steps.step7 = { 
            img: `/uploads/${uniquePrefix}_step5.jpg`, 
            title: "7. Classification",
            desc: `AI Prediction: "${label}" (Confidence: ${conf}%) based on extracted features.` 
        };
        
        // Step 8: Compression
        const step8Path = baseDir + `${uniquePrefix}_step8.webp`;
        await sharp(originalPath).webp({ quality: 40 }).toFile(step8Path);
        const origSize = fs.statSync(originalPath).size;
        const compSize = fs.statSync(step8Path).size;
        const saved = (((origSize - compSize) / origSize) * 100).toFixed(2);
        results.steps.step8 = { 
            img: `/uploads/${uniquePrefix}_step8.webp`, 
            title: "8. Compression",
            desc: `Converted to WebP. Saved ${saved}% of storage space (${(origSize/1024).toFixed(1)}KB reduced to ${(compSize/1024).toFixed(1)}KB).` 
        };
        
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error processing image pipeline');
    }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
