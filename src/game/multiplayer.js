import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, remove, onDisconnect } from 'firebase/database';

const firebaseConfig = {
  databaseURL: 'https://sumo-5db2f-default-rtdb.europe-west1.firebasedatabase.app',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let mySlot = null;
let otherSlot = null;
let remoteRef = null;
let unsubRemote = null;

export async function joinGame() {
  const snap = await get(ref(db, 'game'));
  const data = snap.val() || {};

  if (!data.player1) {
    mySlot = 'player1';
  } else if (!data.player2) {
    mySlot = 'player2';
  } else {
    return { slot: null, error: 'Game is full' };
  }

  otherSlot = mySlot === 'player1' ? 'player2' : 'player1';

  const myRef = ref(db, `game/${mySlot}`);
  remoteRef = ref(db, `game/${otherSlot}`);

  await set(myRef, { x: 0, y: 0, vx: 0, vy: 0 });
  onDisconnect(myRef).remove();

  return { slot: mySlot, error: null };
}

export function sendPosition(x, y, vx, vy, dead = false) {
  if (!mySlot) return;
  set(ref(db, `game/${mySlot}`), { x, y, vx, vy, dead });
}

export function onRemotePosition(callback) {
  if (!remoteRef) return;
  unsubRemote = onValue(remoteRef, (snap) => {
    const data = snap.val();
    callback(data || null);
  });
}

export function leaveGame() {
  if (mySlot) {
    remove(ref(db, `game/${mySlot}`));
    mySlot = null;
    otherSlot = null;
  }
  if (unsubRemote) { unsubRemote(); unsubRemote = null; }
}
