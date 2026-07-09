import React from 'react';
import { Alert, Box } from '@mui/material';
import { useTenantPlan } from '../../hooks/useTenantPlan';
import type { TenantPlanFeatures } from '../../hooks/useTenantPlan';

interface PlanFeatureGateProps {
  feature: keyof TenantPlanFeatures;
  featureLabel?: string;
  children: React.ReactNode;
}

/** Blocks content when the tenant's plan does not include a feature. */
export const PlanFeatureGate: React.FC<PlanFeatureGateProps> = ({
  feature,
  featureLabel,
  children,
}) => {
  const { hasFeature, plan, isTenantPlan } = useTenantPlan();

  if (!isTenantPlan || hasFeature(feature)) {
    return <>{children}</>;
  }

  const label = featureLabel || feature.replace(/_/g, ' ');

  return (
    <Box sx={{ p: 2 }}>
      <Alert severity="warning">
        {label} is not included on your {plan.planName} plan. Upgrade to unlock this feature.
      </Alert>
    </Box>
  );
};
