import { Socket } from 'socket.io-client';

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
}

export class WebRTCService {
  private peerConnections: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private roomId: string = '';
  private userId: string = '';

  constructor() {
    this.handleIceCandidate = this.handleIceCandidate.bind(this);
    this.handleTrack = this.handleTrack.bind(this);
    this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this);
  }

  initialize(socket: Socket, roomId: string, userId: string) {
    this.socket = socket;
    this.roomId = roomId;
    this.userId = userId;

    this.setupSocketListeners();
  }

  async setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    // Add local stream to all existing peer connections
    for (const [peerId, peer] of this.peerConnections) {
      this.addTracksToConnection(peer.connection);
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('user-joined', async ({ userId }: { userId: string }) => {
      console.log('User joined:', userId);
      await this.createPeerConnection(userId);
    });

    this.socket.on('user-left', ({ userId }: { userId: string }) => {
      console.log('User left:', userId);
      this.removePeerConnection(userId);
    });

    this.socket.on('offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      console.log('Received offer from:', from);
      const pc = await this.createPeerConnection(from);
      await pc.connection.setRemoteDescription(offer);
      const answer = await pc.connection.createAnswer();
      await pc.connection.setLocalDescription(answer);
      this.socket?.emit('answer', { to: from, answer });
    });

    this.socket.on('answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      console.log('Received answer from:', from);
      const pc = this.peerConnections.get(from);
      if (pc) {
        await pc.connection.setRemoteDescription(answer);
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      console.log('Received ICE candidate from:', from);
      const pc = this.peerConnections.get(from);
      if (pc) {
        await pc.connection.addIceCandidate(candidate);
      }
    });
  }

  private async createPeerConnection(peerId: string): Promise<PeerConnection> {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId)!;
    }

    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const connection = new RTCPeerConnection(config);
    const peer: PeerConnection = {
      userId: peerId,
      connection,
      stream: null,
    };

    connection.onicecandidate = (event) => this.handleIceCandidate(peerId, event);
    connection.ontrack = (event) => this.handleTrack(peerId, event);
    connection.onnegotiationneeded = () => this.handleNegotiationNeeded(peerId);

    this.peerConnections.set(peerId, peer);
    this.addTracksToConnection(connection);

    return peer;
  }

  private addTracksToConnection(connection: RTCPeerConnection) {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        connection.addTrack(track, this.localStream);
      }
    }
  }

  private removePeerConnection(peerId: string) {
    const peer = this.peerConnections.get(peerId);
    if (peer) {
      peer.connection.close();
      this.peerConnections.delete(peerId);
    }
  }

  private async handleNegotiationNeeded(peerId: string) {
    const peer = this.peerConnections.get(peerId);
    if (peer) {
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);
      this.socket?.emit('offer', { to: peerId, offer });
    }
  }

  private handleIceCandidate(peerId: string, event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      this.socket?.emit('ice-candidate', { to: peerId, candidate: event.candidate });
    }
  }

  private handleTrack(peerId: string, event: RTCTrackEvent) {
    const peer = this.peerConnections.get(peerId);
    if (peer) {
      peer.stream = event.streams[0];
    }
  }

  getPeerStreams(): Map<string, MediaStream | null> {
    const streams = new Map<string, MediaStream | null>();
    for (const [peerId, peer] of this.peerConnections) {
      streams.set(peerId, peer.stream);
    }
    return streams;
  }

  cleanup() {
    for (const [peerId, peer] of this.peerConnections) {
      peer.connection.close();
    }
    this.peerConnections.clear();
    this.localStream = null;
    this.socket = null;
  }
} 