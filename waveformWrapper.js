//This is a wrapper for reading and writing interlaced waveform data with multiple channels
//For example, for a stereo waveform with a left and right channel:
// [Left[0], Right[0], Left[1], Right[1], Left[2], Right[2], ...]
//This wrapper isolates either the left or right channel, allowing us to not have to worry about interlacing

//Gets a wrapper for the given channel from the waveform data
module.exports.getChannel =
({ waveform, curChannel, numChannels = 2 } = {}) =>
    ({
        length: Math.ceil(waveform.length / numChannels),
        get: index => waveform[numChannels * index + curChannel],
        set: (index, value) => {
            waveform[numChannels * index + curChannel] = value;
        },
    });

//Gets a wrapper for a mono stream based on the given stereo waveform data
module.exports.getMono =
({ waveform } = {}) =>
    ({
        length: Math.ceil(waveform.length / 2),
        get: index => (waveform[index * 2] + waveform[index * 2 + 1]) / 2,
    });

//Creates a interlaced stereo waveform from the given mono input
module.exports.monoToStereo = (waveform) => {
    const out = new Float32Array(waveform.length * 2);
    for (let i = 0; i < waveform.length; i++) {
        out[i * 2] = waveform[i];
        out[i * 2 + 1] = waveform[i];
    }
    return out;
};
