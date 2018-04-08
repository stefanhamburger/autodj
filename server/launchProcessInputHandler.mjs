let cache = [];
let totalLength = 0;
let header = {};

export default function inputHandler(callback, buffer) {
  const arrayBuffer = buffer.buffer;

  if (totalLength === 0) {
    const dv = new DataView(arrayBuffer);
    //parse header (type + length)
    header.type = dv.getUint8(0);
    header.id = dv.getUint32(1, true);
    header.length = dv.getUint32(5, true);
  }

  totalLength += arrayBuffer.byteLength;
  cache.push(arrayBuffer);

  if (totalLength < header.length) { //did not yet receive full message
    //do nothing, wait for more messages
  } else if (totalLength > header.length) { //message too long
    throw new Error(`Message length check failed, expected message to be ${header.length} but was at least ${totalLength}`);
  } else { //full message received
    const fullBuffer = Buffer.concat(cache, totalLength);
    const bufferBody = fullBuffer.buffer.slice(9);

    if (header.type === 0) { //string
      //convert ArrayBuffer to string
      const text = String.fromCharCode.apply(null, new Uint8Array(bufferBody));
      //parse JSON
      try {
        const obj = JSON.parse(text);
        callback(true, header.id, obj);
      } catch (err) {
        throw new Error('Could not read JSON message from child');
      }
    } else if (header.type === 1) { //binary
      callback(false, header.id, bufferBody);
    } else {
      throw new Error(`Unknown message type ${header.type} from child`);
    }

    cache = [];
    totalLength = 0;
    header = {};
  }
}
