export type DeploymentOrientation = 'horizontal' | 'vertical';

export const getDeploymentOrientation = (
  widthInches: number,
  heightInches: number,
): DeploymentOrientation => (widthInches >= heightInches ? 'vertical' : 'horizontal');
