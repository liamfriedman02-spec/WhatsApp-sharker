'use client';

/**
 * Physically based glass shared by the core links and the advertiser nodes.
 * `lite` drops transmission for phones and low-power GPUs and keeps the reflections.
 */
export function GlassMaterial({ lite = false, tint = '#e8f1ff' }: { lite?: boolean; tint?: string }) {
  if (lite) {
    return (
      <meshPhysicalMaterial
        color={tint}
        roughness={0.12}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.06}
        transparent
        opacity={0.42}
        envMapIntensity={1.6}
        iridescence={0.35}
        iridescenceIOR={1.25}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color={tint}
      transmission={1}
      thickness={0.55}
      roughness={0.07}
      ior={1.46}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.05}
      iridescence={0.4}
      iridescenceIOR={1.25}
      attenuationColor="#a9c8ff"
      attenuationDistance={2.4}
      envMapIntensity={1.5}
      specularIntensity={1}
    />
  );
}
