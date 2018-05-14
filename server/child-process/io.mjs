//Messages from parent to child will always be in JSON/string format
process.stdin.setEncoding('utf8');
process.stderr.setEncoding('utf8');

//Event handler upon receiving a message
export function setUpReceiver(callback) {
  process.stdin.on('data', (dataString) => {
    //deserialize JSON
    try {
      const dataObj = JSON.parse(dataString);
      callback(dataObj);
    } catch (err) {
      process.stderr.write(`Error processing message ${dataString}: ${err}`);
    }
  });
}


//Send string message to parent
export function sendMessage(id, msgObj = {}) {
  const msg = JSON.stringify(msgObj);
  const out = new Uint8Array(9 + msg.length);
  const dv = new DataView(out.buffer);
  dv.setUint8(0, 0);//type: 0 = string
  dv.setUint32(1, id, true);//id
  dv.setUint32(5, msg.length, true);//length
  for (let i = 0; i < msg.length; i += 1) {
    dv.setUint8(9 + i, msg.charCodeAt(i));
  }
  process.stdout.write(out);
}


//Sends the Uint8Array to the parent
export function sendBuffer(id, buffer, offset = 0, length = undefined) {
  const input = new Uint8Array(buffer);
  const dataLength = length !== undefined ? length : (input.byteLength - offset);

  const out = new Uint8Array(9 + dataLength);
  const dv = new DataView(out.buffer);
  //Write header
  dv.setUint8(0, 1);//type: 1 = binary
  dv.setUint32(1, id, true);//id
  dv.setUint32(5, dataLength, true);//length
  //Write body
  const inputPart = input.subarray(offset, offset + dataLength);
  out.set(inputPart, 9);

  process.stdout.write(out);
}
