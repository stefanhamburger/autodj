export default function inputHandler(callback, buffer) {
  const arrayBuffer = buffer.buffer;
  const dv = new DataView(arrayBuffer);
  //parse header (type + length), perform length integrity check
  const type = dv.getUint8(0);
  const id = dv.getUint32(1, true);
  const length = dv.getUint32(5, true);
  if (arrayBuffer.byteLength !== 9 + length) {
    //TODO: do not throw error but temporarily store buffer contents, and check length again upon next message, see Buffer.concat()
    throw new Error(`Message length check failed, expected message to be ${9 + length} but was ${arrayBuffer.byteLength}`);
  }

  const bufferBody = arrayBuffer.slice(9);

  if (type === 0) { //string
    //convert ArrayBuffer to string
    const text = String.fromCharCode.apply(null, new Uint8Array(bufferBody));
    //parse JSON
    try {
      const obj = JSON.parse(text);
      callback(true, id, obj);
    } catch (err) {
      throw new Error('Could not read JSON message from child');
    }
  } else if (type === 1) { //binary
    callback(false, id, bufferBody);
  } else {
    throw new Error(`Unknown message type ${type} from child`);
  }
}
