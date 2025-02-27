const WebSocket = require('ws')
const {Base64} = require('js-base64');
const uuid = require("uuid");

// const fs = require('fs');
const path = require('path');
const log = require('@vladmandic/pilogger');
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-unpublished-require
const tf = require('@tensorflow/tfjs-node');
const faceapi = require('../dist/face-api.node.js'); // this is equivalent to '@vladmandic/faceapi'

const wss = new WebSocket.Server({ port: 8080 })
let IsInitModel = false;
const modelPathRoot = '../model';

class SingleFace {
    constructor(minScore, maxResults) {
        // log.header();
        log.info('SingleFace constructor:');
        this.minScore = minScore;
        this.maxResults = maxResults;
    }

    async InitModel() {
        const t0 = process.hrtime.bigint();
        await faceapi.tf.setBackend('tensorflow');
        await faceapi.tf.enableProdMode();
        await faceapi.tf.ENV.set('DEBUG', false);
        await faceapi.tf.ready();

        // log.state(`Version: TensorFlow/JS ${faceapi.tf?.version_core} FaceAPI ${faceapi.version.faceapi} Backend: ${faceapi.tf?.getBackend()}`);
        // log.info('Loading FaceAPI models');

        const modelPath = path.join(__dirname, modelPathRoot);
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    }


    async image(imgBuff) {
        const decoded = tf.node.decodeImage(imgBuff);
        const casted = decoded.toFloat();
        const result = casted.expandDims(0);
        decoded.dispose();
        casted.dispose();
        return result;
    }

    async GetLandmarkDescriptors(img) {
        const optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options(
            { minConfidence: this.minScore, any: this.maxResults });
        const tensor = await this.image(img);
        const result = await faceapi
            .detectAllFaces(tensor, optionsSSDMobileNet)
            .withFaceLandmarks()
            .withFaceDescriptors();

        let rc = { landmarks: "" };
        if (result.length === 1) {
            // Convert it to CSV format
            rc.landmarks = result[0].descriptor.join(', ');
        } else {
            rc.landmarks = `incorrect number of objects found: result.length=${result.length}`;
        }
        tensor.dispose();
        return (rc);
    }

}


//////////////////////////////////////////////
wss.on('connection', async (ws) => {

    console.log(`WSS:connection`);
    ws['id'] = uuid.v4();
    const minScore = 0.1;
    const maxResults = 5;
    const sf1 = new SingleFace(minScore, maxResults);

    ws.on('message', async (message) => {
        //////////////////////////////
        // console.log(`Received message => ${message}`)
        if ( IsInitModel === false ) {
            console.log('Calling InitModel()......');
            try {
                await sf1.InitModel();
                IsInitModel = true;
            } catch(error) {
                console.log('Error: InitModel()');
            }
        }

        let req;
        let action = "";
        let id = 0;

        var message_text = message.toString('utf8');
        // console.log( "typeof(message) : " + typeof(message));
        // console.log( "typeof(message_text) : " + typeof(message_text));


        /////////// Parse incoming message ///////////
        try {
            req = JSON.parse(message);
            action = req.action;
            id = req.id;
            console.log(`action : ${action}, id = ${id} `);
        }
        catch (error) {
            console.log(message_text);
            // const buff = fs.writeFileSync( './0.out.js', message_text);
            console.log("JSON.parse Error: message in param");
            console.log("message.len = " + message_text.length);
        }

        /////////// server: GetImgLandmarks ///////////
        let res = JSON.stringify({ xid: 0, id: id, action: `${action} is unknown request` });
        if (action === 'GetImgLandmarks') {
            console.log('Running GetLandmarkDescriptors....');

            // To replace "data:image/jpeg;base64," from the image if any
            var img1 = req.img1.replace(/^data:image\/[a-z]+;base64,/, "");

            // Convert from Base64 to a binary value.
            let buff1 = Base64.toUint8Array(img1);
            let rc = await sf1.GetLandmarkDescriptors(buff1);
            res = rc.landmarks;
        }

        console.log('res len =' + res.length);
        console.log();
        ws.send(res);
    });

    // FYI: xid:1 is needed to identify msg from connection. 
    ws.send(JSON.stringify( {xid:1, id:ws.id, action:"connection", msg:"Success" }));
})

