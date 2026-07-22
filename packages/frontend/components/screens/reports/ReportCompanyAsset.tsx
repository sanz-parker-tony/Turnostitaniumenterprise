'use client';

import { useEffect, useState } from 'react';
import { buildApiUrl } from '../../../utils/api-config';
import { publicApiToken } from '../../../utils/backend/info';

interface ReportCompanyAssetProps {
  companyId: string | null | undefined;
  banner: string | null | undefined;
  logo: string | null | undefined;
  className?: string;
}

function getToken() {
  return localStorage.getItem('tt-access-token') || localStorage.getItem('access_token') || publicApiToken;
}

export default function ReportCompanyAsset({ companyId, banner, logo, className = '' }: ReportCompanyAssetProps) {
  const [sourceUrl, setSourceUrl] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setSourceUrl('');

    const loadAsset = async () => {
      if (!companyId) return;
      const assetTypes = [banner ? 'banner' : '', logo ? 'logo' : ''].filter(Boolean);
      for (const assetType of assetTypes) {
        try {
          const response = await fetch(buildApiUrl(`/organization/companies/${companyId}/asset/${assetType}`), {
            headers: { Authorization: `Bearer ${getToken()}` },
            signal: controller.signal,
          });
          if (!response.ok) continue;
          const blob = await response.blob();
          if (!blob.size) continue;
          objectUrl = URL.createObjectURL(blob);
          setSourceUrl(objectUrl);
          return;
        } catch (error) {
          if (controller.signal.aborted) return;
        }
      }
    };

    void loadAsset();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [companyId, banner, logo]);

  if (!sourceUrl) return null;

  return (
    <img
      src={sourceUrl}
      alt={banner ? 'Banner de la empresa' : 'Logo de la empresa'}
      className={`block max-h-20 max-w-full object-contain object-left ${className}`.trim()}
    />
  );
}
