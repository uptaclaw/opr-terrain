export type DeploymentOrientation = 'horizontal' | 'vertical';

// Players deploy from the long edges of the table.
// Portrait tables therefore use left/right deployment strips, while landscape tables
// use top/bottom deployment strips. Square tables default to horizontal strips.
export const getDeploymentOrientation = (
  widthInches: number,
  heightInches: number,
): DeploymentOrientation => (heightInches > widthInches ? 'vertical' : 'horizontal');
