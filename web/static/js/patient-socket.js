const socket = io('/')
const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
});
const videoGrid = document.getElementById('doctorVideo');
const myVideo = document.getElementById('doc');
myVideo.muted = false;
const peers = {};

const createEmptyAudioTrack = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    return Object.assign(track, { enabled: false });
};
const createEmptyVideoTrack = ({ width, height }) => {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
  
    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];
  
    return Object.assign(track, { enabled: false });
};

const audioTrack = createEmptyAudioTrack();
const videoTrack = createEmptyVideoTrack({ width:640, height:480 });
const emptyMediaStream = new MediaStream([audioTrack, videoTrack]);

myPeer.on('call', call => {
    call.answer(emptyMediaStream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
});

socket.on('user-connected', userId => {
    console.log('User connected : ' + userId);
    setTimeout(() => {
        location.reload();
    }, 3000);
});

socket.on('user-disconnected', userId => {
    console.log('User disconnected : ' + userId);
    if (peers[userId]) {
        peers[userId].close();
    }
})

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);

    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
    });

    call.on("close", () => {
        video.remove();
    });

    peers[userId] = call;
}

function addVideoStream(video, stream) {
    myVideo.srcObject = stream;
    
    video.addEventListener('loadedmetadata', () => {
        let promise = myVideo.play();
        if (promise !== undefined) {
            promise.then( _ => {
                
            }).catch(error => {
                
            });
        }
    });
}