import { buildOPRTerrainSelection } from './src/terrain/oprPlacement';
import { getTemplateById } from './src/terrain/catalog';

const mulberry32 = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), value | 1);
    result = Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const selection = buildOPRTerrainSelection(12, mulberry32(42));

console.log('Terrain selection:');
let totalEstimatedArea = 0;

selection.forEach((spec, i) => {
  const template = getTemplateById(spec.templateId);
  // Estimate area based on typical size - this is approximate
  const estimatedRadius = 3; // Typical terrain piece radius
  const estimatedArea = Math.PI * estimatedRadius * estimatedRadius;
  totalEstimatedArea += estimatedArea;
  
  console.log(`${i + 1}. ${template.name} (${spec.shapeKind}) - Traits: ${template.traits.join(', ')}`);
});

const tableArea = 72 * 48; // 3,456 sq in
const coveragePercent = (totalEstimatedArea / tableArea) * 100;

console.log(`\nEstimated total area: ${totalEstimatedArea.toFixed(0)} sq in`);
console.log(`Table area: ${tableArea} sq in`);
console.log(`Estimated coverage potential: ${coveragePercent.toFixed(1)}% (need ≥50%)`);
