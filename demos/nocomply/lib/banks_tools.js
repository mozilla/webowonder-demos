/** Sequencer setup **/
 var selected = {bank: null, track: null};

 var audioDurationInSeconds;
 var audioDurationInRadians = 2*Math.PI;
 var audioPositionInSeconds = 0;
 var audioPositionInRadians = 0;
 
 
 function isTrackSelected() {
   return (selected.bank !== null && selected.track !== null);
 }

 function startTrack(bankId) {
   if (typeof banks[bankId] === "undefined") { // track bank does not exist yet
     banks[bankId] = [];
   }

   var currentTrackId = banks[bankId].length;

   if (currentTrackId - 1 >= 0 && banks[bankId][currentTrackId - 1].end == null) { // track has not finished
     // do nothing
   } else {
     banks[bankId].push({
       start: audioPositionInRadians,
       end: null
     });

     selected.bank = bankId;
     selected.track = currentTrackId;
   }
 }

 function endTrack(bankId) {
   var currentTrackId = banks[bankId].length - 1;

   banks[bankId][currentTrackId].end = audioPositionInRadians;
 }

 function findActiveBanks(position) {
   var activeBanks = {};
   var activeTrack = null;
   for (var i in banks) {
     activeTrack = findActiveTrack(i, position);
     if (activeTrack !== null) {
       activeBanks[i] = activeTrack;
     }
   }
   return activeBanks;
 }

 function findActiveTrack(bankId, position) {
   var bank = banks[bankId];
   
   if (bank === undefined) {
     throw "Bank: " + bankId + " does not exist.";
   }
   
   for (var i = 0, len = bank.length; i < len; i++) {
     if (bank[i].start <= position && position <= bank[i].end) {
       return i;
     }
   }
   return null;
 }