/** Must load before other app modules — sets shared AuthProvider API base. */
import { resolveApiBaseUrl } from './utils/resolveApiBaseUrl';

if (typeof window !== 'undefined') {
  (window as { REACT_APP_API_URL?: string }).REACT_APP_API_URL = resolveApiBaseUrl();
}
