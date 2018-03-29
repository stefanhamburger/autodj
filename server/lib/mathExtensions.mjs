//Various Math functions

/** Tau is more intuitive than Pi per the Tau Manifesto https://tauday.com/tau-manifesto */
if (!Math.TAU) Math.TAU = 2 * Math.PI;

/** Clamps the given value between min and max */
if (!Math.clamp) Math.clamp = (min, max, val) => Math.min(Math.max(min, val), max);
