{
    const startLink = document.getElementById('startLink');
    startLink.addEventListener('click', async () => {
        startLink.parentNode.removeChild(startLink);

        //start new session
        const response = await fetch('/init');
        const json = await response.json();
        const { sid } = json;

        const audioEle = new Audio();

        //create Audio Source
        const mediaSource = new MediaSource();
        mediaSource.addEventListener('sourceopen', () => {
            //if we already added a source buffer, do not initialize a second time
            if (mediaSource.sourceBuffers.length > 0) return;

            const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
            //we split the stream into arbitrarily-sized blocks that may not match codec windows, so they must be read in sequence
            sourceBuffer.mode = 'sequence';

            setTimeout(() => {
                initAudio({
                    sid,
                    audioEle,
                    mediaSource,
                    sourceBuffer,
                });
            }, 5000);

            //for debugging
            window.audioEle = audioEle;
            window.mediaSource = mediaSource;
            window.sourceBuffer = sourceBuffer;
        });

        try {
            audioEle.srcObject = mediaSource;//not yet supported by major browsers
        } catch (error) {
            audioEle.src = URL.createObjectURL(mediaSource);
        }
        audioEle.autoplay = true;
        audioEle.controls = true;
        audioEle.preload = 'auto';//otherwise, the file will not autoplay
        audioEle.volume = 0.1;
        document.body.appendChild(audioEle);
    });
}
