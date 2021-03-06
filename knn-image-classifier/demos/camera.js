/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licnses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as tf from '@tensorflow/tfjs';
import * as knn from '@tensorflow-models/knn-image-classifier';
import Stats from 'stats.js';

const videoWidth = 300;
const videoHeight = 250;
const stats = new Stats();

// Number of classes to classify
const NUM_CLASSES = 3;

// K value for KNN
const TOPK = 10;

const infoTexts = [];
let training = -1;
let model;
let video;

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

/**
 * Setup training GUI. Adds a training button for each class,
 * and sets up mouse events.
 */
function setupGui() {
  // Create training buttons and info texts
  for (let i = 0; i < NUM_CLASSES; i++) {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.style.marginBottom = '10px';

    // Create training button
    const button = document.createElement('button');
    button.innerText = 'Train ' + i;
    div.appendChild(button);

    // Listen for mouse events when clicking the button
    button.addEventListener('mousedown', () => training = i);
    button.addEventListener('mouseup', () => training = -1);

    // Create info text
    const infoText = document.createElement('span');
    infoText.innerText = ' No examples added';
    div.appendChild(infoText);
    infoTexts.push(infoText);
  }
}

/**
 * Load the KNN model
 */
async function loadKNN() {
  const model = await knn.load(NUM_CLASSES, TOPK);
  return model;
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);
}

/**
 * Animation function called on each frame, running prediction
 */
function animate() {
  stats.begin();

  // Get image data from video element
  const image = tf.fromPixels(video);

  // Train class if one of the buttons is held down
  if (training != -1) {
    // Add current image to classifier
    model.addImage(image, training);
  }

  // If any examples have been added, run predict
  const exampleCount = model.getClassExampleCount();
  if (Math.max(...exampleCount) > 0) {
    model.predictClass(image)
      .then((res) => {
        for (let i = 0; i < NUM_CLASSES; i++) {
          // Make the predicted class bold
          if (res.classIndex == i) {
            infoTexts[i].style.fontWeight = 'bold';
          } else {
            infoTexts[i].style.fontWeight = 'normal';
          }

          // Update info text
          if (exampleCount[i] > 0) {
            const conf = res.confidences[i] * 100;
            infoTexts[i].innerText = ` ${exampleCount[i]} examples - ${conf}%`;
          }
        }
      })
      // Dispose image when done
      .then(() => image.dispose());
  } else {
    image.dispose();
  }

  stats.end();

  requestAnimationFrame(animate);
}

/**
 * Kicks off the demo by loading the knn model, finding and loading
 * available camera devices, and setting off the animate function.
 */
export async function bindPage() {
  // Load the KNN model
  model = await loadKNN();

  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';

  // Setup the GUI
  setupGui();
  setupFPS();

  // Setup the camera
  try {
    video = await setupCamera();
    video.play();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
      'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  // Start animation loop
  animate();
}

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();
