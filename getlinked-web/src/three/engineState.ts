/** Signals passed between the network simulation and the core, outside React. */
export const engineState = {
  /** Flash on the nucleus when a lead passes through, decays to 0. */
  pulse: 0,
  /** Flash on each advertiser when a lead lands, decays to 0. */
  destinationPulse: [0, 0, 0],
};
