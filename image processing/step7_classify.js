async function classifyObject() {
    console.log("Starting Step 7: Object Recognition & Classification...\n");

    // The Feature Vector extracted from Step 6
    const features = {
        aspectRatio: 0.97,
        fillRatio: 66.46,
        r: 111, g: 119, b: 112
    };

    console.log("Input Feature Vector received by the AI Classifier:");
    console.log(features);
    console.log("\nAnalyzing features against known object profiles...\n");

    let classification = "Unknown Object";
    let confidence = 0;

    // A Rule-based Decision Tree (Simulating a trained Machine Learning model)
    // The algorithm compares the numbers against patterns it has "learned" from previous rainy images
    
    if (features.aspectRatio > 1.5) {
        classification = "Vehicle / Car";
        confidence = 85;
    } 
    else if (features.aspectRatio < 0.4) {
        classification = "Streetlamp / Pedestrian (Standing without umbrella)";
        confidence = 78;
    } 
    else if (features.aspectRatio >= 0.8 && features.aspectRatio <= 1.2) {
        // The aspect ratio is roughly 1:1 (Square). Let's check the fill ratio.
        if (features.fillRatio > 90) {
            classification = "Building Window / Signboard";
            confidence = 90;
        } 
        else if (features.fillRatio >= 50 && features.fillRatio <= 80) {
            // The object isn't a solid block. It has curves or empty gaps inside its bounding box.
            if (features.r < 130 && features.g < 130 && features.b < 130) {
                // The object is relatively dark
                classification = "Person holding an Umbrella";
                confidence = 94;
            } else {
                // The object is bright
                classification = "Illuminated Traffic Light / Headlight";
                confidence = 75;
            }
        }
    }

    console.log("✅ Step 7 Complete! Object successfully classified.");
    console.log("==========================================");
    console.log(`🧠 PREDICTION:   ${classification}`);
    console.log(`📊 CONFIDENCE:   ${confidence}%`);
    console.log("==========================================");
    console.log("Algorithm Reasoning:");
    console.log(`- Aspect Ratio (${features.aspectRatio}) is nearly 1:1, meaning the bounding box is a square.`);
    console.log(`- Area Fill Ratio (${features.fillRatio}%) indicates it is not a solid block; it has curved edges (like an umbrella dome).`);
    console.log(`- The dark gray average color (R:${features.r}, G:${features.g}, B:${features.b}) matches dark rain gear or silhouettes.`);
}

classifyObject();
