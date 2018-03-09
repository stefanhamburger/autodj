/**
 * Isomorphic function to calculate the new duration after tempo adjustment.
 * This must produce identical results on client- and server-side.
 */
export default (duration, tempoAdjustment) => {
  //TODO: need to calculate more precisely based on tempo-change.mjs
  return Math.floor(duration / tempoAdjustment + 1);
};
