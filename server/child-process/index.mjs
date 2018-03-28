//Set up event handler and function to send messages to parent

//Event handler upon receiving a message
process.stdin.on('data', (buffer) => {
  //...
  console.log('Message received by worker!');
});

const sendMessage = (msg) => {
  process.stdout.write('Hello world from child process!');
};

sendMessage();
