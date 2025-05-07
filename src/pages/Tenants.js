import React, { useEffect, useState } from 'react';
import { listTenants } from '../api/tenants';

function Tenants() {
  const [tenants, setTenants] = useState([]);
  useEffect(() => {
    listTenants().then(setTenants);
  }, []);
  return (
    <div>
      <h2>Tenants</h2>
      <ul>
        {tenants.map((tenant) => (
          <li key={tenant.tenantId}>{tenant.name || tenant.tenantId}</li>
        ))}
      </ul>
    </div>
  );
}

export default Tenants; 