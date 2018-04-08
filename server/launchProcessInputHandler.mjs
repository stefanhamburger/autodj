export default function getInputHandler(callback) {
  let fullBuffer;
  let totalLength = 0;
  let header = {};

  return (buffer) => {
    if (totalLength === 0) {
      //parse header (type + length)
      header.type = buffer.readUInt8(0);
      header.id = buffer.readUInt32LE(1);
      header.length = buffer.readUInt32LE(5);

      //set up buffer to store full message, and add body from received message
      fullBuffer = new Uint8Array(header.length);
      for (let i = 9; i < buffer.length; i += 1) {
        fullBuffer[i - 9] = buffer.readUInt8(i);
      }
      totalLength += buffer.length - 9;
    } else {
      //add complete received buffer
      fullBuffer.set(buffer, totalLength);
      totalLength += buffer.length;
    }


    if (totalLength < header.length) { //did not yet receive full message
      //do nothing, wait for more messages
    } else if (totalLength > header.length) { //message too long
      throw new Error(`Message length check failed, expected message to be ${header.length} but was at least ${totalLength}`);
    } else { //full message received
      if (header.type === 0) { //string
        //convert ArrayBuffer to string
        const text = String.fromCharCode.apply(null, new Uint8Array(fullBuffer));
        //parse JSON
        try {
          const obj = JSON.parse(text);
          callback(true, header.id, obj);
        } catch (err) {
          throw new Error(`Could not read JSON message from child: ${err}`);
        }
      } else if (header.type === 1) { //binary
        callback(false, header.id, fullBuffer.buffer);
      } else {
        throw new Error(`Unknown message type ${header.type} from child`);
      }

      //reset variables
      fullBuffer = undefined;
      totalLength = 0;
      header = {};
    }
  };
}
