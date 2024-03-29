// var localVideo;
var localStream;
// var remoteVideo;
var peerConnection;
var uuid;
var serverConnection;

var peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

function pageReady() {
  uuid = createUUID();

  // localVideo = document.getElementById('localVideo');
  // remoteVideo = document.getElementById('remoteVideo');
  console.log("webrtc --- 0");

  // serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
  // serverConnection = new WebSocket('wss://' + 'localhost' + ':8443');
  serverConnection = new WebSocket('wss://' + 'ec2-13-58-134-195.us-east-2.compute.amazonaws.com' + ':8443');
  serverConnection.onmessage = gotMessageFromServer;
  console.log("webrtc --- 1");
  // var constraints = {
  //   video: true,
  //   audio: true,
  // };
  //
  // if(navigator.mediaDevices.getUserMedia) {
  //   navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  // } else {
  //   alert('Your browser does not support getUserMedia API');
  // }
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  // localVideo.srcObject = stream;
}

function start(isCaller) {
  console.log("webrtc --- 2");

  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
  // peerConnection.addStream(localStream);
  console.log("webrtc --- 3");

  if(isCaller) {
    peerConnection.createOffer().then(createdDescription).catch(errorHandler);
  }
}

function gotMessageFromServer(message) {
  if(!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if(signal.uuid == uuid) return;

  if(signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
      // Only create answers in response to offers
      if(signal.sdp.type == 'offer') {
        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if(signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if(event.candidate != null) {
    serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
  }
}

function createdDescription(description) {
  console.log('got description');

  peerConnection.setLocalDescription(description).then(function() {
    peerConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  console.log('got remote stream');
  // remoteVideo.srcObject = event.streams[0];
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
