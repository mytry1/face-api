import * as tf from '../dist/tfjs.esm';
import * as draw from './draw/index';
import * as utils from './utils/index';
import * as pkg from '../package.json';

export { tf, draw, utils };

export * from './ageGenderNet/index';
export * from './classes/index';
export * from './dom/index';
export * from './env/index';
export * from './faceExpressionNet/index';
export * from './faceLandmarkNet/index';
export * from './faceRecognitionNet/index';
export * from './factories/index';
export * from './globalApi/index';
export * from './ops/index';
export * from './ssdMobilenetv1/index';
export * from './tinyFaceDetector/index';
export * from './tinyYolov2/index';
export * from './euclideanDistance';
export * from './NeuralNetwork';
export * from './resizeResults';

const node = (typeof process !== 'undefined');
// eslint-disable-next-line no-undef
const browser = (typeof navigator !== 'undefined') && (typeof navigator.userAgent !== 'undefined');
export const version = { faceapi: pkg.version as string, node, browser };
