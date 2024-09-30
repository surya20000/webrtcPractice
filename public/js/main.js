const createUserBtn = document.getElementById("create-user");
const username = document.getElementById("username");
const allUsersHtml = document.querySelector("#allusers");
const localVideo = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const endCallBtn = document.querySelector("#end-call-btn");

const socket = io();
let localStream;
let caller = [];

//* Singleton Method for Peer Connection
const PeerConnection = (function () {
  let peerConnection;

  const createPeerConnection = () => {
    const config = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };
    peerConnection = new RTCPeerConnection(config);

    //* add local Streams to peer connection

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    //* listen to remote stream and add to peer connection

    peerConnection.ontrack = function (event) {
      remoteVideo.srcObject = event.streams[0];
    };

    //* listen for ice candidates
    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit("icecandidate", event.candidate);
      }
    };

    return peerConnection;
  };

  return {
    getInstance: () => {
      if (!peerConnection) {
        peerConnection = createPeerConnection();
      }
      return peerConnection;
    },
  };
})();

//* handel browser event

createUserBtn.addEventListener("click", (e) => {
  if (username.value !== "") {
    socket.emit("join-user", username.value);
    const userNameContainer = document.querySelector(".username-input");
    userNameContainer.style.display = "none";
  }
});

endCallBtn.addEventListener("click", (e) => {
  socket.emit("call-ended", caller);
});

//* handel socket event
socket.on("joined", (allUsers) => {
  const createUsersHtml = () => {
    allUsersHtml.innerHTML = "";
    for (const user in allUsers) {
      const li = document.createElement("li");
      li.textContent = `${user} ${user === username.value ? "(You)" : ""}`;
      if (user !== username.value) {
        const button = document.createElement("button");
        button.classList.add("call-btn");
        button.addEventListener("click", (e) => {
          startCall(user);
        });
        const img = document.createElement("img");
        img.setAttribute("src", "/images/phone.png");
        img.setAttribute("width", 20);
        button.appendChild(img);

        li.appendChild(button);
      }

      allUsersHtml.appendChild(li);
    }
  };
  createUsersHtml();
});

socket.on("offer", async ({ from, to, offer }) => {
  const pc = PeerConnection.getInstance();
  // *set remote description
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { from, to, answer: pc.localDescription });
  caller = [from, to];
});

socket.on("answer", async ({ from, to, answer }) => {
  const pc = PeerConnection.getInstance();
  await pc.setRemoteDescription(answer);
  //* show end call button
  endCallBtn.style.display = "block";
  socket.emit("end-call", { from, to });
  caller = [from, to];
});

socket.on("icecandidate", async (candidate) => {
  const pc = PeerConnection.getInstance();
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("end-call", ({ from, to }) => {
  endCallBtn.style.display = "block";
});

socket.on("call-ended", (caller) => {
  endCall();
});

//* start call method
const startCall = async (user) => {
  const pc = PeerConnection.getInstance();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer", {
    from: username.value,
    to: user,
    offer: pc.localDescription,
  });
};

//* end call method
const endCall = async () => {
  const pc = PeerConnection.getInstance();
  if (pc) {
    pc.close();
    endCallBtn.style.display = "none"
  }
};

//* initial app
const startMyVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    localStream = stream;
    localVideo.srcObject = stream;
  } catch (error) {}
};
startMyVideo();
