///////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////Show different pages

// Show start page function
const showStartPage = () => {
  ipcRenderer.send('reload-to-start');
};

// Show recording page function
const showRecordingPage = () => {
  window.location.href = './recording.html'; //cleaner URL in github, replace with 'recording.html' if running locally
};



///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// Define html elements

// define modal elements
const uploadConfirmationModal = new bootstrap.Modal(document.getElementById('uploadConfirmationModal'));
const confirmUploadButton = document.getElementById("confirmUpload");
const deleteConfirmationModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
const confirmDeleteButton = document.getElementById("confirmDelete");
const startRecordingConfirmationModal = new bootstrap.Modal(document.getElementById('startRecordingConfirmationModal'));
const confirmStartRecordingButton = document.getElementById("confirmStartRecording");


// define buttons from html
const recordButton = document.getElementById('recordButton');
const replayButton = document.getElementById('replayButton');
const deleteButton = document.getElementById('deleteButton');
const uploadButton = document.getElementById('uploadVideoButton');

const cameraSelect = document.getElementById('cameraSelect');
const addCameraButton = document.getElementById('addCamera');
const videoContainer = document.getElementById('video-container');
const contextMenu = document.getElementById('contextMenu');
const deleteStreamOption = document.getElementById('deleteStream');


// create global variables for cameras and recording functions
let mediaRecorder; //create global mediaRecorder to be referenced in all recording page functions
let recordedChunks = []; //create global recorded chunks to be referenced in all recording page functions
let isRecording = false; //create global variable isRecording to false everytime the page runs, to be used in toggleRecording function
let streamMap = {};
let activeElement = null;
let streamCounter = 0;
let canvasStream = null;
let recordedBlob;
const addedCameraDeviceIds = new Set();



///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// Adding cameras

// Start camera when page opens
window.addEventListener('load', function() {
  listCameras();

  // // wait 15 seconds to allow mediaRecorder to load (takes time on certain laptops)
  // console.log("Camera stream started. Waiting 15 seconds before enabling recording...");

  // // Hide the record button initially and show the loading message
  // recordButton.style.display = "none";
  // initMessageContainer.style.display = "block";

  // setTimeout(() => {
  //   // After 15 seconds, show the record button and hide the message
  //   recordButton.style.display = "inline-block";
  //   recordButton.disabled = false;
  //   initMessageContainer.style.display = "none";
  //   console.log("MediaRecorder ready. Recording button enabled.");
  // }, 1); // 15-second delay

  recordButton.style.display = "inline-block";
  recordButton.disabled = false;
  initMessageContainer.style.display = "none";
  console.log("MediaRecorder ready. Recording button enabled.");
});

// Detect all webcams
async function listCameras() {
  try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device =>
        device.kind === 'videoinput' && !addedCameraDeviceIds.has(device.deviceId)
    );
    
    // Clear previous options except the first one
    while (cameraSelect.options.length > 1) {
      cameraSelect.remove(1);
    }

    // Add detected cameras to dropdown
    videoDevices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${videoDevices.indexOf(device) + 1}`;
      cameraSelect.appendChild(option);
    });
    
    // Add a placeholder if no cameras found
    if (videoDevices.length === 0) {
      const option = document.createElement('option');
      option.value = "";
      option.text = "No cameras found";
      option.disabled = true;
      cameraSelect.appendChild(option);
    }
  } catch (error) {
    console.error('Error listing cameras:', error);
  }
}

// Add camera streams to container
async function addCameraStream(deviceId) {
  try {
    const constraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false // No need to capture audio from the camera stream because we are using default computer mic
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const streamId = `stream-${streamCounter}`;

    const streamContainer = document.createElement('div');
    streamContainer.className = 'stream-container';
    streamContainer.id = streamId;
    streamContainer.dataset.deviceId = deviceId;
    streamContainer.dataset.streamId = streamId;
    streamContainer.style.position = 'absolute';
    streamContainer.style.top = '0px';
    streamContainer.style.left = '0px';
    streamContainer.style.width = '320px';
    streamContainer.style.height = '240px';

    streamMap[streamId] = stream;

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.muted = true;
    streamContainer.appendChild(video);

    // Create handles for resizing stream container
    ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(corner => {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = `resize-handle ${corner}`;
      streamContainer.appendChild(resizeHandle);
      setupResizable(streamContainer, resizeHandle);
    });

    videoContainer.style.position = 'relative';
    videoContainer.appendChild(streamContainer);

    //setupDraggable(streamContainer);

    setupContextMenu(streamContainer);

    streamCounter++;
  } catch (error) {
    console.error('Error accessing camera:', error);
  }
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// Dragging, resizing, deleting streams

// Global methods to make streams draggable within container
let draggingElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

document.addEventListener('mousedown', function (e) {
  const element = e.target.closest('.stream-container');
  if (element && !e.target.classList.contains('resize-handle')) {
    draggingElement = element;
    const rect = element.getBoundingClientRect();
    const containerRect = videoContainer.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    element.style.zIndex = 10;
  }
});

document.addEventListener('mousemove', function (e) {
  if (!draggingElement) return;

  const containerRect = videoContainer.getBoundingClientRect();
  let newLeft = e.clientX - containerRect.left - dragOffsetX;
  let newTop = e.clientY - containerRect.top - dragOffsetY;

  // Constrain within container
  newLeft = Math.max(0, Math.min(newLeft, containerRect.width - draggingElement.offsetWidth));
  newTop = Math.max(0, Math.min(newTop, containerRect.height - draggingElement.offsetHeight));

  draggingElement.style.left = newLeft + 'px';
  draggingElement.style.top = newTop + 'px';
});

document.addEventListener('mouseup', function () {
  if (draggingElement) {
    draggingElement.style.zIndex = 1;
    draggingElement = null;
  }
});

// Make element resizable (local function for each stream, not global)
function setupResizable(element, handle) {
  let isResizing = false;
  let startX, startY;
  let startWidth, startHeight;
  let startLeft, startTop;

  handle.addEventListener('mousedown', function (e) {
    e.preventDefault();
    isResizing = true;
    activeElement = element;

    startX = e.clientX;
    startY = e.clientY;

    // Get position relative to the parent (videoContainer)
    const parentRect = videoContainer.getBoundingClientRect();
    const rect = element.getBoundingClientRect();

    startWidth = rect.width;
    startHeight = rect.height;
    startLeft = rect.left - parentRect.left;
    startTop = rect.top - parentRect.top;

    document.body.style.cursor = window.getComputedStyle(handle).cursor;
  });

  document.addEventListener('mousemove', function (e) {
  if (!isResizing) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  const isTop = handle.classList.contains('top-left') || handle.classList.contains('top-right');
  const isLeft = handle.classList.contains('top-left') || handle.classList.contains('bottom-left');

  let newWidth = startWidth + (isLeft ? -dx : dx);
  let newHeight = startHeight + (isTop ? -dy : dy);
  let newLeft = isLeft ? startLeft + dx : startLeft;
  let newTop = isTop ? startTop + dy : startTop;

  // Get bounds of the container
  const containerWidth = videoContainer.clientWidth;
  const containerHeight = videoContainer.clientHeight;

  // Constrain width and left
  if (newLeft < 0) {
    newWidth += newLeft; // reduce width by how far we're over
    newLeft = 0;
  }
  if (newLeft + newWidth > containerWidth) {
    newWidth = containerWidth - newLeft;
  }

  // Constrain height and top
  if (newTop < 0) {
    newHeight += newTop;
    newTop = 0;
  }
  if (newTop + newHeight > containerHeight) {
    newHeight = containerHeight - newTop;
  }

  // Set final styles
  element.style.width = Math.max(100, newWidth) + 'px';
  element.style.height = Math.max(100, newHeight) + 'px';
  element.style.left = newLeft + 'px';
  element.style.top = newTop + 'px';
  });

  document.addEventListener('mouseup', function () {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = 'default';
    }
  });
}

// Set up context menu (for removing stream)
function setupContextMenu(element) {
  element.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    activeElement = element;

    // Ensure context menu is visible to measure dimensions
    contextMenu.style.display = 'block';

    // Get bounding box of videoContainer (which is relative)
    const containerRect = videoContainer.getBoundingClientRect();

    // Calculate position relative to videoContainer
    let menuX = e.clientX - containerRect.left;
    let menuY = e.clientY - containerRect.top;

    // Get context menu dimensions
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;

    // Prevent menu from going outside videoContainer
    if (menuX + menuWidth > containerRect.width) {
        menuX = containerRect.width - menuWidth - 5;
    }
    if (menuY + menuHeight > containerRect.height) {
        menuY = containerRect.height - menuHeight - 5;
    }

    // Set final position
    contextMenu.style.left = `${menuX}px`;
    contextMenu.style.top = `${menuY}px`;

    e.stopPropagation();
  });
}

// Delete stream
function deleteStream(element) {
  if (!element) return;

  const streamId = element.id;
  const deviceId = element.dataset.deviceId;

  console.log("Deleting stream:", streamId);

  if (streamMap[streamId]) {
    // Stop all tracks in the stream
    const stream = streamMap[streamId];
    stream.getTracks().forEach(track => {
      console.log("Stopping track:", track.kind);
      track.stop();
    });

    // Remove from map
    delete streamMap[streamId];

    // Remove from added devices
    if (deviceId) {
      addedCameraDeviceIds.delete(deviceId);
      console.log("Removed deviceId from added list:", deviceId);
      listCameras(); // Re-render dropdown with available devices
    }

    // Remove element
    element.remove();
    console.log("Stream deleted:", streamId);
  } else {
    console.error("Stream not found in map:", streamId);
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// Event listeners and functions for simple recording controls

// Hide context menu when clicking elsewhere in window
document.addEventListener('click', function(e) {
  if (e.target.id !== 'deleteStream') {
    contextMenu.style.display = 'none';
  }
});

// Add camera button event listener
addCameraButton.addEventListener('click', function() {
  const selectedDeviceId = cameraSelect.value;

  if (!selectedDeviceId) {
      alert("Please select a camera first.");
      return;
  }

  addCameraStream(selectedDeviceId);
  addedCameraDeviceIds.add(selectedDeviceId);  // Track added device
  listCameras(); // Refresh dropdown to exclude added devices
  cameraSelect.value = "";
});

// Delete stream button event listener
deleteStreamOption.addEventListener('click', function(e) {
  e.stopPropagation(); // Prevent event from bubbling up
  
  if (activeElement) {
    console.log("Delete clicked for:", activeElement.id);
    deleteStream(activeElement);
    activeElement = null;
    contextMenu.style.display = 'none';
  } else {
    console.error("No active element to delete");
  }

});

// Toggle between "start recording" and "stop recording" buttons
function toggleRecording() {
  const recordButton = document.getElementById('recordButton');
  if (isRecording) {
    // Stop recording
    stopRecording();
    recordButton.innerHTML = '<i class="fas fa-circle-dot"></i> Start Recording';
    recordButton.classList.remove('btn-danger');  // Remove red color
    recordButton.classList.add('btn-success');  // Add original color
    toggleButtons(true); // Show other buttons when a recording is available
  } else {
    // Start recording
    const replayVideoContainer = document.getElementById('replay-video-container');
    const replayVideo = document.getElementById('replayVideo');
    videoContainer.style.display = 'block';
    replayVideo.style.display = 'none';
    replayVideoContainer.style.display = 'none';
    startRecording();
    recordButton.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
    recordButton.classList.remove('btn-success');  // Remove original color
    recordButton.classList.add('btn-danger');  // Add red color
    toggleButtons(false); // Hide other buttons while recording
  }
  isRecording = !isRecording;  // Toggle the recording state
}

// Toggle function to show/hide replay, delete, and upload buttons when recording/not recording
function toggleButtons(show) {
  const buttons = [replayButton, deleteButton, uploadButton];
  buttons.forEach(button => {
    button.classList.toggle('hidden', !show);
  });
}

//record button functionality
document.getElementById('recordButton').addEventListener('click', () => {
  if (uploadButton && uploadButton.offsetParent !== null) {
    // The upload button (and other recording control buttons) is visible, indicating second recording attempt
    startRecordingConfirmationModal.show(); // prompt user to confirm new recording, which will delete old recordings in following functions
  } else {
    toggleRecording();
  }
});

//replay button functionality
document.getElementById('replayButton').addEventListener('click', replayRecording);

//delete button functionality
document.getElementById('deleteButton').addEventListener('click', () => {
  deleteConfirmationModal.show(); //prompt user to confirm video deletion
});

//confirm delete button functionality
confirmDeleteButton.addEventListener("click", () => {
  deleteRecording();
});

//upload video button functionality
document.getElementById('uploadVideoButton').addEventListener('click', () => {
  uploadConfirmationModal.show(); //prompt user to confirm video upload
});

//confirm upload button functionality
confirmUploadButton.addEventListener("click", () => {
  uploadVideo();
});

//confirm start new recording button functionality
confirmStartRecordingButton.addEventListener("click", () => {

  // Clear previous recording data if any
  recordedChunks = [];
  recordedBlob = null;

  // getVideoBlobFromDB().then(videoBlobs => {
  //   if (videoBlobs.length > 0) {
  //     recordedChunks = []; // Clear recorded chunks
  //     // Delete old recordings if starting new recording
  //     deleteAllVideosFromDB().then(() => {
  //       console.log('Video deleted from IndexedDB');
  //     }).catch(err => {
  //       console.error('Error deleting video from IndexedDB:', err);
  //     });
  //   } 
  // }).catch(err => {
  //   console.error('Error deleting video from IndexedDB:', err);
  // });
  
  toggleRecording();
});
  


///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// Recording functions

// Start recording function
async function startRecording() {
  // Hide confirmation modal
  startRecordingConfirmationModal.hide();

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const videos = videoContainer.getElementsByTagName('video');

  // Ensure high resolution recording
  const scaleFactor = 2; // or more, depending on desired resolution
  canvas.width = videoContainer.offsetWidth * scaleFactor;
  canvas.height = videoContainer.offsetHeight * scaleFactor;
  ctx.scale(scaleFactor, scaleFactor);

  drawInterval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const containerRect = videoContainer.getBoundingClientRect();
    
    for (let video of videos) {
      const rect = video.getBoundingClientRect();
      const x = rect.left - containerRect.left;
      const y = rect.top - containerRect.top;

      // Get user-defined container size
      const containerWidth = video.offsetWidth;
      const containerHeight = video.offsetHeight;

      // Get actual video stream dimensions
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (videoWidth === 0 || videoHeight === 0) continue; // skip if not loaded yet

      // Calculate aspect ratio fit
      const videoAspect = videoWidth / videoHeight;
      const containerAspect = containerWidth / containerHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (videoAspect > containerAspect) {
        // Video is wider than container
        drawWidth = containerWidth;
        drawHeight = containerWidth / videoAspect;
        offsetX = 0;
        offsetY = (containerHeight - drawHeight) / 2;
      } else {
        // Video is taller than container
        drawHeight = containerHeight;
        drawWidth = containerHeight * videoAspect;
        offsetX = (containerWidth - drawWidth) / 2;
        offsetY = 0;
      }

      // Draw video with correct aspect ratio
      ctx.drawImage(video, x + offsetX, y + offsetY, drawWidth, drawHeight);
    }
  }, 1000 / 60); // 60 fps

  // Put video component of canvas in canvasStream
  canvasStream = canvas.captureStream(60); 

  ////// Combine video components and audio stream
  const combinedStream = new MediaStream();
  // Add canvas video track
  canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
  // Get desktop audio stream (from the system audio)
  try {
    const desktopAudioStream = await navigator.mediaDevices.getUserMedia({ audio: { mediaSource: 'audio' } });
    // Add desktop audio track to the combined stream
    desktopAudioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
  } catch (err) {
    console.error('Failed to capture desktop audio:', err);
  }

  // Use mediaRecorder to record combinedStream (contains all video streams and audio stream)
  mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2' // Use mp4 or webm
  });

  recordedChunks = []; // Clear previous chunks if any (THIS WILL DELETE ALL PREVIOUSLY RECORDED VIDEOS)
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };

  mediaRecorder.start();
  console.log('Recording started');
}

// Stop recording function
function stopRecording() {
  mediaRecorder.stop();
  clearInterval(drawInterval); // stop drawing onto the canvas
  mediaRecorder.onstop = () => {
    console.log('Recording stopped');
    recordedBlob = new Blob(recordedChunks, { type: 'video/mp4' });
    // const blob = new Blob(recordedChunks, { type: 'video/mp4' });
    // // Save the video blob to IndexedDB
    // saveVideoBlobToDB(blob)
    //   .then(() => console.log('Video saved to IndexedDB'))
    //   .catch(err => console.error('Error saving video to IndexedDB:', err));
  };
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// Post-recording processing/viewing

// Create video URL to use in saveVideo function (called when upload video button is clicked and confirmed)
async function uploadVideo() {
  const studentName = localStorage.getItem('studentName');
  const facilitatorName = localStorage.getItem('facilitatorName');
  const date = localStorage.getItem('date');
  const procedureDescription = localStorage.getItem('procedureDescription');

  // Check if there are recorded chunks
  if (recordedChunks.length === 0) {
    alert('Please record a video first by pressing "Start Recording".');
    return;  // Prevent upload
  }

  const arrayBuffer = await recordedBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  ipcRenderer.send('save-video', {
    studentName,
    facilitatorName,
    date,
    procedureDescription,
    buffer
  });

  // getVideoBlobFromDB().then(async videoBlobs => {
  //   if (videoBlobs.length > 0) {
  //     const videoBlob = videoBlobs[videoBlobs.length - 1]; // Get the most recent video Blob
  //     // const videoUrl = URL.createObjectURL(videoBlob);  // Create a URL for the Blob
  //     // saveVideo(studentName, facilitatorName, date,  procedureDescription, videoUrl);  // Use URL for the video
      
  //     // Send videoBlob to main.js using ipcRenderer (cannot send as blob, so need to make buffer)
  //     const arrayBuffer = await videoBlob.arrayBuffer();
  //     const buffer = Buffer.from(arrayBuffer); // <-- Ensure Buffer is available in your preload.js
  //     ipcRenderer.send('save-video', {
  //         studentName, 
  //         facilitatorName, 
  //         date,  
  //         procedureDescription, 
  //         buffer
  //     });
  //     // alert('Video saved successfully!');
  //     // showStartPage(); //bring back to start page
  //   } else {
  //     alert('No video to upload. Please record a video first.');
  //   }
  // }).catch(err => {
  //   console.error('Error retrieving video from IndexedDB:', err);
  // });
}

// Catch video-saved success event from main.js
ipcRenderer.on('video-saved', () => {
  alert('Video saved successfully!');
  recordedChunks=[];
  recordedBlob=null;

  // // Delete video from IndexedDB after saving
  // deleteAllVideosFromDB().then(() => {
  //   console.log('Video deleted from IndexedDB');
  // }).catch(err => {
  //   console.error('Error deleting video from IndexedDB:', err);
  // });

  // Delete all info + videos from local storage after saving
  try {
    localStorage.clear();
    console.log('local storage cleared');
  } catch (err) {
    console.error('Error clearing localStorage:', err);
  };
  
  // Bring back to start page
  showStartPage(); 
})

// Function to replay the video after recording
function replayRecording() {

  if (!recordedBlob) {
    alert('No recording available to replay!');
    return;
  }

  const videoUrl = URL.createObjectURL(recordedBlob);
  const replayVideoContainer = document.getElementById('replay-video-container');
  const replayVideo = document.getElementById('replayVideo');

  replayVideo.src = videoUrl;
  videoContainer.style.display = 'none';
  replayVideoContainer.style.display = 'block';
  replayVideo.style.display = 'block';
  replayVideo.play();

  console.log("Replaying video...");
  
  // getVideoBlobFromDB().then(videoBlobs => {
  //   if (videoBlobs.length > 0) {
  //     const videoBlob = videoBlobs[videoBlobs.length - 1]; // Get the most recent video Blob
  //     const videoUrl = URL.createObjectURL(videoBlob);  // Create a URL for the Blob
  //     const replayVideoContainer = document.getElementById('replay-video-container');
  //     const replayVideo = document.getElementById('replayVideo');
  //     replayVideo.src = videoUrl;  // Set the video source to the fetched Blob URL
  //     videoContainer.style.display = 'none';
  //     replayVideo.style.display = 'block';
  //     replayVideoContainer.style.display = 'block';
  //     replayVideo.play();  // Play the video
  //     console.log("Replaying video...");
  //   } else {
  //     alert("No recording available to replay!");
  //   }
  // }).catch(err => {
  //   console.error('Error retrieving video from IndexedDB:', err);
  // });
}

// Function to delete the current recording and reset the state
function deleteRecording() {

  if (!recordedBlob) {
    alert('No recording to delete.');
    return;
  }

  recordedChunks = [];
  recordedBlob = null;

  const replayVideo = document.getElementById('replayVideo');
  const replayVideoContainer = document.getElementById('replay-video-container');

  replayVideo.pause();
  replayVideo.src = '';
  replayVideoContainer.style.display = 'none';
  videoContainer.style.display = 'block';

  deleteConfirmationModal.hide();
  alert('Recording deleted and reset.');
  
  // getVideoBlobFromDB().then(videoBlobs => {
  //   if (videoBlobs.length > 0) {
  //     recordedChunks = []; // Clear recorded chunks
  //     videoContainer.src = ''; // Clear the video source
  //     const replayVideo = document.getElementById('replay-video-container');
  //     replayVideo.style.display = 'none'; // hide the replay screen
  //     videoContainer.style.display = 'block'; // show videoContainer to replace replay screen
  //     deleteAllVideosFromDB().then(() => {
  //       console.log('Video deleted from IndexedDB');
  //     }).catch(err => {
  //       console.error('Error deleting video from IndexedDB:', err);
  //     });
  //     deleteConfirmationModal.hide();
  //     alert('Recording deleted and reset.');
  //   } else {
  //     alert("There are currently no saved recordings. Please record a video first.");
  //   }
  // }).catch(err => {
  //   console.error('Error deleting video from IndexedDB:', err);
  // });
}

// // Save video directly to computer using video URL from uploadVideo() function (define destination folder in browser settings, not used because now using buffer instead of videoURL to send to main.js)
// function saveVideo(studentName, facilitatorName, date,  procedureDescription, videoUrl) {
//   const downloadLink = document.createElement('a');     // Create a link element
//   downloadLink.href = videoUrl; // Set the href to the Blob URL
//   downloadLink.download = `${studentName} (Dr ${facilitatorName}, ${date}, ${procedureDescription})`;  // Set the download attribute to specify the filename
//   downloadLink.click(); // Programmatically trigger a click event on the link to start the download
//   URL.revokeObjectURL(videoUrl); // Optionally, revoke the Blob URL if you're done with it
// }



///////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////IndexedDB functions (for saving studentt recordings temporarily in larger storage capacity than localStorage)
/////////Retained from initial website building

// // Open IndexedDB database
// function openDB() {
//   return new Promise((resolve, reject) => {
//     const request = indexedDB.open('videoDB', 1);

//     request.onupgradeneeded = event => {
//       const db = event.target.result;
//       if (!db.objectStoreNames.contains('videos')) {
//         db.createObjectStore('videos', { autoIncrement: true });
//       }
//     };

//     request.onerror = event => {
//       reject('Error opening IndexedDB');
//     };

//     request.onsuccess = event => {
//       resolve(event.target.result);
//     };
//   });
// }

// // Save video blob to IndexedDB
// function saveVideoBlobToDB(blob) {
//   return openDB().then(db => {
//     const transaction = db.transaction('videos', 'readwrite');
//     const store = transaction.objectStore('videos');
    
//     // Create a File object with the proper name and type
//     const videoFile = new File([blob], 'video_recording.mp4', { type: 'video/mp4' });  // You can change the file extension and MIME type
//     store.add(videoFile);

//     return new Promise((resolve, reject) => {
//       transaction.oncomplete = () => resolve();
//       transaction.onerror = () => reject('Error saving video to DB');
//     });
//   });
// }

// // Retrieve video blob from IndexedDB
// function getVideoBlobFromDB() {
//   return openDB().then(db => {
//     const transaction = db.transaction('videos', 'readonly');
//     const store = transaction.objectStore('videos');
//     const request = store.getAll();

//     return new Promise((resolve, reject) => {
//       request.onsuccess = () => resolve(request.result);
//       request.onerror = () => reject('Error retrieving video from DB');
//     });
//   });
// }

// // Delete videos stored in IndexedDB
// function deleteAllVideosFromDB() {
//   return openDB().then(db => {
//     const transaction = db.transaction('videos', 'readwrite');
//     const store = transaction.objectStore('videos');
    
//     // Clear all records in the object store
//     const deleteRequest = store.clear();

//     return new Promise((resolve, reject) => {
//       deleteRequest.onsuccess = () => resolve();
//       deleteRequest.onerror = () => reject('Error deleting all videos from DB');
//     });
//   });
// }