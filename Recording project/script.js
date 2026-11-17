document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const liveVideo = document.getElementById('live-video');
    const btnPhoto = document.getElementById('btn-photo');
    const btnRecordStart = document.getElementById('btn-record-start');
    const btnRecordStop = document.getElementById('btn-record-stop');
    const recordingStatus = document.getElementById('recording-status');
    const snapshotCanvas = document.getElementById('snapshot-canvas');
    const gallery = document.getElementById('gallery');

    let stream = null;
    let mediaRecorder = null;
    let recordedChunks = [];

    // Initialize Camera
    async function initCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720 }, 
                audio: true 
            });
            liveVideo.srcObject = stream;
        } catch (err) {
            console.error("Error accessing media devices.", err);
            alert("Could not access camera/microphone. Please ensure permissions are granted.");
        }
    }

    initCamera();

    // Take Photo
    btnPhoto.addEventListener('click', () => {
        if (!stream) return;

        // Set canvas dimensions to match video frame
        snapshotCanvas.width = liveVideo.videoWidth;
        snapshotCanvas.height = liveVideo.videoHeight;

        // Draw the current video frame onto the canvas
        const ctx = snapshotCanvas.getContext('2d');
        
        // Handle mirroring - video is mirrored via CSS, so we need to flip the canvas context
        // if we want the saved image to look exactly like the preview.
        // Actually, usually users prefer photos to be unmirrored (like a real camera).
        // Let's just draw it as the camera sees it (unmirrored).
        ctx.drawImage(liveVideo, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

        // Convert canvas to image URL
        const dataUrl = snapshotCanvas.toDataURL('image/png');
        
        createMediaCard(dataUrl, 'photo');
    });

    // Start Recording
    btnRecordStart.addEventListener('click', () => {
        if (!stream) return;

        recordedChunks = [];
        
        // Check for supported mime types
        let options = { mimeType: 'video/webm;codecs=vp9,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm;codecs=vp8,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'video/webm' };
            }
        }

        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error('Exception while creating MediaRecorder:', e);
            return;
        }

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            createMediaCard(videoUrl, 'video');
            
            // Reset UI
            recordingStatus.classList.add('hidden');
            btnRecordStart.disabled = false;
            btnRecordStop.disabled = true;
            btnPhoto.disabled = false;
        };

        // Start recording
        mediaRecorder.start();
        
        // Update UI
        recordingStatus.classList.remove('hidden');
        btnRecordStart.disabled = true;
        btnRecordStop.disabled = false;
        btnPhoto.disabled = true; // Disable photo taking while recording to avoid issues
    });

    // Stop Recording
    btnRecordStop.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    });

    // Helper function to create gallery items
    function createMediaCard(url, type) {
        const card = document.createElement('div');
        card.className = 'media-card';

        const timestamp = new Date();
        const formattedTime = timestamp.toLocaleString();
        
        // Generate a safe filename
        const safeDate = timestamp.toISOString().replace(/[:.]/g, '-');
        const defaultFilename = type === 'photo' ? `Capture_${safeDate}.png` : `Recording_${safeDate}.webm`;

        let mediaElement = '';
        if (type === 'photo') {
            mediaElement = `<img src="${url}" alt="Captured Photo">`;
        } else {
            mediaElement = `<video src="${url}" controls></video>`;
        }

        card.innerHTML = `
            ${mediaElement}
            <div class="media-card-actions">
                <span class="media-timestamp">${formattedTime}</span>
                <button class="download-link" data-url="${url}" data-filename="${defaultFilename}">Save</button>
            </div>
        `;

        // Prepend to gallery (newest first)
        gallery.insertBefore(card, gallery.firstChild);

        // Attach click listener for saving (File System Access API approach)
        const saveBtn = card.querySelector('.download-link');
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const btn = e.target;
            const fileUrl = btn.getAttribute('data-url');
            const fileName = btn.getAttribute('data-filename');

            try {
                // Try to use the modern File System Access API if available
                if ('showSaveFilePicker' in window) {
                    const opts = {
                        suggestedName: fileName,
                        types: type === 'photo' 
                            ? [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }]
                            : [{ description: 'WebM Video', accept: { 'video/webm': ['.webm'] } }]
                    };
                    
                    const handle = await window.showSaveFilePicker(opts);
                    const writable = await handle.createWritable();
                    
                    // Fetch the blob from the object URL
                    const response = await fetch(fileUrl);
                    const blob = await response.blob();
                    
                    // Write the blob to the selected file
                    await writable.write(blob);
                    await writable.close();
                    
                    alert('File saved successfully!');
                } else {
                    // Fallback for browsers that don't support showSaveFilePicker
                    triggerStandardDownload(fileUrl, fileName);
                }
            } catch (err) {
                // User might have cancelled the picker, or an error occurred
                if (err.name !== 'AbortError') {
                    console.error('Error saving file:', err);
                    // Fallback to standard download if API fails unexpectedly
                    triggerStandardDownload(fileUrl, fileName);
                }
            }
        });
    }

    // Fallback standard download
    function triggerStandardDownload(url, filename) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);
    }
});
