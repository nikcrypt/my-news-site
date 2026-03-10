import PocketBase from 'pocketbase';

export const pb = new PocketBase('http://127.0.0.1:8090'); // ← or your production URL

// Optional: if you want anonymous access only (no auth needed here)
pb.autoCancellation(false); // useful in some Astro setups