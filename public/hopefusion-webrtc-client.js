/**
 * HopeFusion Africa — WebRTC Client + Socket.io Client
 * Drop this into any page that needs messaging or video calls
 * Include: <script src="/hopefusion-webrtc-client.js"></script>
 * Requires: <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
 */

class HopeFusionRTC {
  constructor(config = {}) {
    this.apiUrl      = config.apiUrl  || window.HFA_CONFIG?.API_URL  || '';
    this.wsUrl       = config.wsUrl   || window.HFA_CONFIG?.WS_URL   || '';
    this.token       = config.token   || localStorage.getItem('hfa_token');
    this.socket      = null;
    this.peerConn    = null;
    this.localStream = null;
    this.currentCall = null;
    this.onMessage   = config.onMessage   || null;
    this.onCall      = config.onCall      || null;
    this.onNotif     = config.onNotif     || null;
    this.onPresence  = config.onPresence  || null;
    this.ICE_SERVERS = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
  }

  /* ── CONNECT ─────────────────────────────────────────────── */
  connect() {
    if (!this.token) throw new Error('HopeFusion: No auth token — call connect() after login');
    this.socket = io(this.wsUrl || undefined, {
      auth:          { token: this.token },
      transports:    ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay:    2000,
    });
    this._attachListeners();
    return this;
  }

  _attachListeners() {
    const s = this.socket;

    s.on('connect', () => {
      console.log('[HFA-RTC] Connected to HopeFusion real-time server');
      this._emit('connected');
    });

    s.on('disconnect', (reason) => {
      console.warn('[HFA-RTC] Disconnected:', reason);
      this._emit('disconnected', { reason });
    });

    s.on('connect_error', (err) => {
      console.error('[HFA-RTC] Connection error:', err.message);
    });

    /* MESSAGES */
    s.on('message:received', (msg)     => this._handleIncoming(msg));
    s.on('message:sent',     (msg)     => this._emit('message_sent', msg));
    s.on('message:typing',   (data)    => this._emit('typing', data));
    s.on('message:typing_stop', (data) => this._emit('typing_stop', data));
    s.on('message:read_receipt', (d)   => this._emit('read_receipt', d));

    /* NOTIFICATIONS */
    s.on('notification:new',        (n) => { if (this.onNotif) this.onNotif(n); this._emit('notification', n); });
    s.on('notifications:unread_count', (d) => this._emit('unread_count', d));

    /* PRESENCE */
    s.on('user:online',  (d) => { if (this.onPresence) this.onPresence({ ...d, status: 'online' }); });
    s.on('user:offline', (d) => { if (this.onPresence) this.onPresence({ ...d, status: 'offline' }); });

    /* MATCHES */
    s.on('match:new',           (m) => this._emit('new_match', m));
    s.on('grant:status_update', (g) => this._emit('grant_update', g));

    /* CALLS */
    s.on('call:incoming',  (data) => this._handleIncomingCall(data));
    s.on('call:accepted',  (data) => this._handleCallAccepted(data));
    s.on('call:declined',  (data) => this._handleCallDeclined(data));
    s.on('call:ended',     (data) => this._handleCallEnded(data));
    s.on('call:error',     (data) => this._emit('call_error', data));

    /* WEBRTC */
    s.on('webrtc:offer',         (d) => this._handleOffer(d));
    s.on('webrtc:answer',        (d) => this._handleAnswer(d));
    s.on('webrtc:ice_candidate', (d) => this._handleIceCandidate(d));
    s.on('webrtc:screen_share',  (d) => this._emit('screen_share_toggle', d));
    s.on('webrtc:media_toggle',  (d) => this._emit('media_toggle', d));

    /* LIVE SESSIONS */
    s.on('live:participant_joined', (d) => this._emit('participant_joined', d));
    s.on('live:participant_left',   (d) => this._emit('participant_left', d));
    s.on('live:question',  (d) => this._emit('live_question', d));
    s.on('live:hand_raised', (d) => this._emit('hand_raised', d));
    s.on('live:reaction',  (d) => this._emit('live_reaction', d));
  }

  /* ── MESSAGING ───────────────────────────────────────────── */

  sendMessage(recipientId, content, threadId = null, attachments = []) {
    return new Promise((resolve, reject) => {
      this.socket.emit('message:send', { recipient_id: recipientId, content, thread_id: threadId, attachments }, (res) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res?.data);
      });
    });
  }

  loadThread(threadId, limit = 30, before = null) {
    return new Promise((resolve, reject) => {
      this.socket.emit('messages:thread', { thread_id: threadId, limit, before }, (res) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res?.data);
      });
    });
  }

  markRead(threadId) {
    return new Promise((resolve) => {
      this.socket.emit('message:read', { thread_id: threadId }, resolve);
    });
  }

  sendTyping(threadId, recipientId)     { this.socket.emit('message:typing',      { thread_id: threadId, recipient_id: recipientId }); }
  stopTyping(threadId, recipientId)     { this.socket.emit('message:typing_stop',  { thread_id: threadId, recipient_id: recipientId }); }
  markAllRead()                         { this.socket.emit('notifications:mark_read', {}); }

  _handleIncoming(msg) {
    if (this.onMessage) this.onMessage(msg);
    this._emit('message', msg);
    // Browser notification if page not focused
    if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Message from ${msg.sender?.first_name || 'HopeFusion'}`, {
        body: msg.content?.slice(0, 80),
        icon: '/icons/icon-192x192.png',
        tag:  `msg-${msg.thread_id}`,
      });
    }
  }

  /* ── CALLING ─────────────────────────────────────────────── */

  async call(recipientId, callType = 'video', sessionId = null) {
    await this._getLocalMedia(callType);
    return new Promise((resolve, reject) => {
      this.socket.emit('call:initiate', { recipient_id: recipientId, call_type: callType, session_id: sessionId }, (res) => {
        if (res?.error) { this._stopLocalMedia(); reject(new Error(res.error)); return; }
        this.currentCall = { call_id: res.call_id, recipient_id: recipientId, type: callType, role: 'caller' };
        this._emit('call_initiated', this.currentCall);
        resolve(res.call_id);
      });
    });
  }

  async acceptCall(callId, callerId, callType = 'video') {
    await this._getLocalMedia(callType);
    this.currentCall = { call_id: callId, caller_id: callerId, type: callType, role: 'callee' };
    this.socket.emit('call:accept', { call_id: callId, caller_id: callerId });
    await this._createPeerConnection(callerId, false);
  }

  declineCall(callId, callerId) {
    this.socket.emit('call:decline', { call_id: callId, caller_id: callerId });
    this.currentCall = null;
  }

  endCall(recipientId, durationSeconds = 0) {
    if (!this.currentCall) return;
    this.socket.emit('call:end', {
      call_id:          this.currentCall.call_id,
      recipient_id:     recipientId,
      duration_seconds: durationSeconds,
    });
    this._cleanup();
  }

  _handleIncomingCall(data) {
    this.currentCall = { ...data, role: 'callee' };
    if (this.onCall) this.onCall(data);
    this._emit('incoming_call', data);
  }

  async _handleCallAccepted(data) {
    if (this.currentCall?.role === 'caller') {
      await this._createPeerConnection(data.accepter_id, true);
    }
    this._emit('call_accepted', data);
  }

  _handleCallDeclined(data) {
    this._cleanup();
    this._emit('call_declined', data);
  }

  _handleCallEnded(data) {
    this._cleanup();
    this._emit('call_ended', data);
  }

  /* ── WEBRTC PEER CONNECTION ──────────────────────────────── */

  async _createPeerConnection(peerId, isCaller) {
    this.peerConn = new RTCPeerConnection({ iceServers: this.ICE_SERVERS });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => this.peerConn.addTrack(t, this.localStream));
    }

    // Handle remote tracks
    this.peerConn.ontrack = (event) => {
      this._emit('remote_stream', { stream: event.streams[0] });
    };

    // ICE candidates
    this.peerConn.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice_candidate', {
          recipient_id: peerId,
          call_id:      this.currentCall?.call_id,
          candidate:    event.candidate,
        });
      }
    };

    // Connection state changes
    this.peerConn.onconnectionstatechange = () => {
      this._emit('connection_state', { state: this.peerConn.connectionState });
      if (['failed', 'disconnected'].includes(this.peerConn.connectionState)) {
        this._emit('call_connection_lost', {});
      }
    };

    if (isCaller) {
      // Create and send SDP offer
      const offer = await this.peerConn.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await this.peerConn.setLocalDescription(offer);
      this.socket.emit('webrtc:offer', { recipient_id: peerId, call_id: this.currentCall?.call_id, sdp: offer });
    }
  }

  async _handleOffer({ caller_id, call_id, sdp }) {
    if (!this.peerConn) await this._createPeerConnection(caller_id, false);
    await this.peerConn.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await this.peerConn.createAnswer();
    await this.peerConn.setLocalDescription(answer);
    this.socket.emit('webrtc:answer', { caller_id, call_id, sdp: answer });
  }

  async _handleAnswer({ sdp }) {
    if (this.peerConn) {
      await this.peerConn.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }

  async _handleIceCandidate({ candidate }) {
    if (this.peerConn && candidate) {
      try { await this.peerConn.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    }
  }

  /* ── MEDIA CONTROLS ──────────────────────────────────────── */

  async _getLocalMedia(callType) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      });
      this._emit('local_stream', { stream: this.localStream });
      return this.localStream;
    } catch (err) {
      throw new Error(`Camera/microphone access denied: ${err.message}`);
    }
  }

  toggleAudio() {
    if (!this.localStream) return false;
    const track = this.localStream.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; return track.enabled; }
    return false;
  }

  toggleVideo() {
    if (!this.localStream) return false;
    const track = this.localStream.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; return track.enabled; }
    return false;
  }

  async startScreenShare(peerId) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack  = screenStream.getVideoTracks()[0];
      const sender = this.peerConn?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);
      screenTrack.onended = () => this.stopScreenShare(peerId);
      this.socket.emit('webrtc:screen_share', { recipient_id: peerId, call_id: this.currentCall?.call_id, sharing: true });
      this._emit('screen_share_started', {});
      return screenTrack;
    } catch (err) {
      throw new Error(`Screen share failed: ${err.message}`);
    }
  }

  async stopScreenShare(peerId) {
    const camTrack = this.localStream?.getVideoTracks()[0];
    const sender   = this.peerConn?.getSenders().find(s => s.track?.kind === 'video');
    if (sender && camTrack) await sender.replaceTrack(camTrack);
    this.socket.emit('webrtc:screen_share', { recipient_id: peerId, call_id: this.currentCall?.call_id, sharing: false });
    this._emit('screen_share_stopped', {});
  }

  _stopLocalMedia() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
  }

  _cleanup() {
    this._stopLocalMedia();
    this.peerConn?.close();
    this.peerConn  = null;
    this.currentCall = null;
  }

  /* ── LIVE SESSIONS ───────────────────────────────────────── */

  joinLiveSession(sessionId)    { return new Promise((res) => this.socket.emit('live:join', { session_id: sessionId }, res)); }
  leaveLiveSession(sessionId)   { this.socket.emit('live:leave', { session_id: sessionId }); }
  askQuestion(sessionId, q)     { this.socket.emit('live:question', { session_id: sessionId, question: q }); }
  raiseHand(sessionId)          { this.socket.emit('live:raise_hand', { session_id: sessionId }); }
  sendReaction(sessionId, emoji){ this.socket.emit('live:reaction', { session_id: sessionId, emoji }); }

  /* ── MATCH SUBSCRIPTIONS ─────────────────────────────────── */
  subscribeToMatches(startupId) { this.socket.emit('subscribe:matches', { startup_id: startupId }); }

  /* ── PUSH NOTIFICATIONS SETUP ────────────────────────────── */
  async requestPushPermission() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    if (perm === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: this._urlBase64ToUint8(window.HFA_CONFIG?.VAPID_PUBLIC_KEY || ''),
      });
      // Send subscription to backend
      await fetch(`${this.apiUrl}/api/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body:    JSON.stringify(sub),
      });
      return true;
    }
    return false;
  }

  _urlBase64ToUint8(b64) {
    const pad  = '='.repeat((4 - b64.length % 4) % 4);
    const raw  = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  /* ── EVENT EMITTER ───────────────────────────────────────── */
  _listeners = {};
  on(event, fn)   { (this._listeners[event] = this._listeners[event] || []).push(fn); return this; }
  off(event, fn)  { this._listeners[event] = (this._listeners[event] || []).filter(f => f !== fn); }
  _emit(event, d) { (this._listeners[event] || []).forEach(fn => fn(d)); }

  disconnect() { this.socket?.disconnect(); this._cleanup(); }
}

/* ── USAGE EXAMPLE ───────────────────────────────────────────
const rtc = new HopeFusionRTC({ token: localStorage.getItem('hfa_token') });
rtc.connect();

// Listen for messages
rtc.on('message', msg => console.log('New message:', msg));

// Send a message
await rtc.sendMessage('recipient-uuid', 'Hello from HopeFusion!');

// Start a video call
const callId = await rtc.call('recipient-uuid', 'video');

// Handle remote video stream
rtc.on('remote_stream', ({ stream }) => {
  document.getElementById('remote-video').srcObject = stream;
});

// Handle local stream
rtc.on('local_stream', ({ stream }) => {
  document.getElementById('local-video').srcObject = stream;
});

// Handle incoming call
rtc.on('incoming_call', (data) => {
  if (confirm(`Incoming call from ${data.caller_name}. Accept?`)) {
    rtc.acceptCall(data.call_id, data.caller_id, data.call_type);
  } else {
    rtc.declineCall(data.call_id, data.caller_id);
  }
});
─────────────────────────────────────────────────────────── */

// Make globally available
window.HopeFusionRTC = HopeFusionRTC;
