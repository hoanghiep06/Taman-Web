import { useMediaQuery } from './useMediaQuery';
import { BREAKPOINTS } from '../utils/breakpoints';

export const useIsDesktop = () => useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);