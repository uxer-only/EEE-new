import { Navigate } from 'react-router-dom';

// Agencies do not have a public page — their companion profiles appear on /browse
// like independent profiles. This stub keeps any stale links from breaking.
export default function AgencyPublic() {
  return <Navigate to="/browse" replace />;
}
