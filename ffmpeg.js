const { Writable } = require('stream');
const { ffmpeg } = require('ffmpeg-stream');

module.exports.createNewInstance = () => {
    const ffmpegInstance = ffmpeg();

    const inputStream = ffmpegInstance.input({
        f: 'f32le', //our waveform data is an Float32Array, so the input is PCM 32-bit IEEE floating point in little endian
        ar: '48k', //48,000 sample rate for highest quality
        ac: '2', //two channels, stereo input
    });

    //create an output stream
    const outputStream = ffmpegInstance.output({
        f: 'webm', //Webm container
        'codec:a': 'libopus', //Opus codec
        ar: '48k', //Opus only supports 48,000 sample rate
        //'b:a': '128k', //bitrate - TODO: replace this by 'q:a'
        vn: true, //no video stream
        map_metadata: '-1', //strip metadata
    });

    //create Writable stream that stores the converted data
    let outputBuffer = [];
    const outputWritable = new Writable({
        write(chunk, encoding, callback) {
            outputBuffer.push(chunk);
            callback(null);
        },
    });
    outputStream.pipe(outputWritable);

    ffmpegInstance.run();

    return {
        inputStream,
        getOutputBuffer: () => {
            //returns the current contents of the output buffer, then clears it
            const out = outputBuffer.slice(0);
            outputBuffer = [];
            return out;
        },
        killCommand: () => { ffmpegInstance.kill(); },
    };
};
