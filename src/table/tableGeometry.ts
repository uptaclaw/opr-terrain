export const DEFAULT_TABLE_WIDTH_INCHES = 72;
export const DEFAULT_TABLE_HEIGHT_INCHES = 48;
export const DEFAULT_DEPLOYMENT_DEPTH_INCHES = 12;
export const DEFAULT_TABLE_TITLE = 'OPR Terrain Layout';

export type DeploymentOrientation = 'horizontal' | 'vertical';

// Players deploy from the long edges of the table.
// Portrait tables therefore use left/right deployment strips, while landscape tables
// use top/bottom deployment strips. Square tables default to horizontal strips.
export const getDeploymentOrientation = (
  widthInches: number,
  heightInches: number,
): DeploymentOrientation => (heightInches > widthInches ? 'vertical' : 'horizontal');
