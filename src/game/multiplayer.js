import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, remove, onDisconnect } from 'firebase/database';

const firebaseConfig = {
  databaseURL: 'https://sumo-5db2f-default-rtdb.europe-west1.firebasedatabase.app',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let mySlot = null;
let remoteRef = null;
let unsubscribe = null;

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

  const myRef = ref(db, `game/${mySlot}`);
  const otherSlot = mySlot === 'player1' ? 'player2' : 'player1';
  remoteRef = ref(db, `game/${otherSlot}`);

  // Mark our slot as taken
  await set(myRef, { x: 0, y: 0 });

  // Auto-remove on disconnect
  onDisconnect(myRef).remove();

  return { slot: mySlot, error: null };
}

export function sendPosition(x, y, dead = false) {
  if (!mySlot) return;
  set(ref(db, `game/${mySlot}`), { x, y, dead });
}

export function onRemotePosition(callback) {
  if (!remoteRef) return;
  unsubscribe = onValue(remoteRef, (snap) => {
    const data = snap.val();
    if (data) {
      callback(data);
    } else {
      callback(null); // other player left
    }
  });
}

export function leaveGame() {
  if (mySlot) {
    remove(ref(db, `game/${mySlot}`));
    mySlot = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
