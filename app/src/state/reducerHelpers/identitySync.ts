import { getAuthoritativeModuleName } from '../../../../shared/src';
import type { DesignState } from '../../types';

export function syncModuleIdentityProjection(state: DesignState): DesignState {
  return {
    ...state,
    moduleList: state.moduleList.map((moduleNode) => ({
      ...moduleNode,
      name: getAuthoritativeModuleName(moduleNode.id, state.packageContentByModuleId[moduleNode.id], moduleNode.name)
    }))
  };
}
