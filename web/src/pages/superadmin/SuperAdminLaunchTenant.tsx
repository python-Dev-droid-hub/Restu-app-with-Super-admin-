import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Step, StepLabel, Stepper, TextField, Typography, Paper, MenuItem,
  Alert, Grid, FormControlLabel, Switch, Card, CardContent, Slider,
} from '@mui/material';
import { SuperAdminLayout } from '../../components/superadmin/SuperAdminLayout';
import { TenantBrandingFields } from '../../components/superadmin/TenantBrandingFields';
import { superAdminApi, superAdminApiErrorMessage } from '../../services/superAdminApi';
import { fetchSuperAdminPlans } from '../../hooks/useSuperAdminPlans';

const steps = ['Restaurant Info', 'Plan', 'Branding', 'First Branch', 'Review'];
const BUSINESS_TYPES = ['RESTAURANT', 'CAFE', 'BAKERY', 'CLOUD_KITCHEN', 'FOOD_TRUCK'];

function planIdOf(plan: { _id?: string; id?: string }): string {
  return String(plan._id ?? plan.id ?? '');
}

export default function SuperAdminLaunchTenant() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', slug: '', legalName: '', businessType: 'RESTAURANT', cuisineType: '',
    ownerName: '', ownerEmail: '', ownerPhone: '', city: '', country: 'Pakistan',
    planId: '', billingCycle: 'MONTHLY', enableTrial: true, trialDays: 14,
    primaryColor: '#FA4A0C', secondaryColor: '#2D2D2D', logoUrl: '', faviconUrl: '',
    branchName: '', addressLine: '', branchCity: '', area: '', lat: '', lng: '',
    openingTime: '09:00', closingTime: '23:00', deliveryRadiusKm: 10,
  });

  useEffect(() => {
    setPlansLoading(true);
    setPlansError('');
    void fetchSuperAdminPlans()
      .then((list) => {
        setPlans(list);
        if (list.length === 1) {
          setForm((f) => (f.planId ? f : { ...f, planId: planIdOf(list[0]) }));
        }
      })
      .catch((err: unknown) => {
        setPlans([]);
        setPlansError(superAdminApiErrorMessage(err, 'Failed to load plans'));
      })
      .finally(() => setPlansLoading(false));
  }, []);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const canProceed = () => {
    if (step === 0) {
      return Boolean(
        form.name.trim() &&
          form.slug.trim() &&
          form.ownerName.trim() &&
          form.ownerEmail.trim() &&
          form.ownerPhone.trim()
      );
    }
    if (step === 1) return Boolean(form.planId);
    if (step === 3) return Boolean(form.branchName.trim() && form.addressLine.trim());
    return true;
  };

  const stepError = () => {
    if (step === 0) return 'Fill in restaurant name, slug, owner name, email, and phone.';
    if (step === 1) return plans.length ? 'Select a subscription plan to continue.' : 'No plans available yet. Restart the API server to auto-seed plans, or run: npm run seed:plans --prefix server';
    if (step === 3) return 'Branch name and address are required.';
    return '';
  };

  const suggestSlug = async (name: string) => {
    if (!name) return;
    const res: any = await superAdminApi.get('/tenants/suggest-slug', { name });
    if (res.data?.slug) set('slug', res.data.slug);
  };

  const uploadLogo = async (file: File, field: 'logoUrl' | 'faviconUrl') => {
    const reader = new FileReader();
    reader.onload = async () => {
      const res: any = await superAdminApi.post('/upload/image', { image: reader.result, filename: file.name });
      if (res.data?.url) set(field, res.data.url);
    };
    reader.readAsDataURL(file);
  };

  const selectedPlan = plans.find((p) => planIdOf(p) === form.planId);
  const yearlySavings = selectedPlan && selectedPlan.priceYearly
    ? Math.round((1 - selectedPlan.priceYearly / (selectedPlan.priceMonthly * 12)) * 100)
    : 0;

  const submit = async () => {
    setError('');
    if (!form.planId) {
      setError('Select a subscription plan before launching.');
      setStep(1);
      return;
    }
    try {
      const res: any = await superAdminApi.post('/tenants', {
        name: form.name, slug: form.slug, legalName: form.legalName,
        businessType: form.businessType, cuisineType: form.cuisineType,
        ownerName: form.ownerName, ownerEmail: form.ownerEmail, ownerPhone: form.ownerPhone,
        city: form.city, country: form.country, planId: form.planId,
        billingCycle: form.billingCycle, enableTrial: form.enableTrial, trialDays: form.trialDays,
        primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
        logoUrl: form.logoUrl || undefined, faviconUrl: form.faviconUrl || undefined,
        branch: {
          name: form.branchName, addressLine: form.addressLine,
          city: form.branchCity || form.city, area: form.area,
          lat: form.lat ? Number(form.lat) : undefined, lng: form.lng ? Number(form.lng) : undefined,
          openingTime: form.openingTime, closingTime: form.closingTime,
          deliveryRadiusKm: form.deliveryRadiusKm,
        },
      });
      setResult(res.data);
      setStep(5);
    } catch (err: unknown) {
      setError(superAdminApiErrorMessage(err, 'Launch failed'));
    }
  };

  return (
    <SuperAdminLayout>
      <Typography variant="h5" fontWeight={700} mb={3}>Launch New Restaurant</Typography>
      <Stepper activeStep={step} sx={{ mb: 4 }}>{steps.map((l) => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}</Stepper>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        {step === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Restaurant Name" value={form.name} onChange={(e) => { set('name', e.target.value); suggestSlug(e.target.value); }} required /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Subdomain Slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} helperText={form.slug ? `${form.slug}.yourapp.com` : ''} required /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Legal Name" value={form.legalName} onChange={(e) => set('legalName', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth select label="Business Type" value={form.businessType} onChange={(e) => set('businessType', e.target.value)}>
                {BUSINESS_TYPES.map((b) => <MenuItem key={b} value={b}>{b.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Cuisine Type" value={form.cuisineType} onChange={(e) => set('cuisineType', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Owner Name" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} required /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Owner Email" type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} required /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Owner Phone" value={form.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} required /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="City" value={form.city} onChange={(e) => set('city', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Country" value={form.country} onChange={(e) => set('country', e.target.value)} /></Grid>
          </Grid>
        )}

        {step === 1 && (
          <Grid container spacing={2}>
            {plansLoading && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">Loading subscription plans…</Alert>
              </Grid>
            )}
            {plansError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error">{plansError} — try signing in again at /superadmin/login</Alert>
              </Grid>
            )}
            {!plansLoading && !plansError && !plans.length && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="warning">
                  No plans found. Restart the API server (plans auto-seed on startup) or run: npm run seed:plans --prefix server
                </Alert>
              </Grid>
            )}
            {plans.filter((p) => p.isActive).map((p) => {
              const id = planIdOf(p);
              return (
                <Grid size={{ xs: 12, md: 6 }} key={id}>
                  <Card
                    variant={form.planId === id ? 'outlined' : undefined}
                    sx={{
                      borderColor: form.planId === id ? 'primary.main' : undefined,
                      cursor: 'pointer',
                      borderWidth: form.planId === id ? 2 : 1,
                    }}
                    onClick={() => set('planId', id)}
                  >
                    <CardContent>
                      <Typography fontWeight={700}>{p.name}</Typography>
                      <Typography>PKR {p.priceMonthly?.toLocaleString()}/mo · {p.maxBranches} branches</Typography>
                      <Typography variant="caption">Yearly: PKR {p.priceYearly?.toLocaleString()}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth select label="Billing Cycle" value={form.billingCycle} onChange={(e) => set('billingCycle', e.target.value)}>
                <MenuItem value="MONTHLY">Monthly</MenuItem>
                <MenuItem value="YEARLY">Yearly {yearlySavings > 0 ? `(save ${yearlySavings}%)` : ''}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}><FormControlLabel control={<Switch checked={form.enableTrial} onChange={(e) => set('enableTrial', e.target.checked)} />} label="Free trial" /></Grid>
            {form.enableTrial && (
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth type="number" label="Trial days" value={form.trialDays} onChange={(e) => set('trialDays', Number(e.target.value))} /></Grid>
            )}
          </Grid>
        )}

        {step === 2 && (
          <TenantBrandingFields
            values={{
              primaryColor: form.primaryColor,
              secondaryColor: form.secondaryColor,
              logoUrl: form.logoUrl,
              faviconUrl: form.faviconUrl,
              name: form.name,
              slug: form.slug,
            }}
            onChange={(field, value) => set(field, value)}
            onUpload={(file, field) => uploadLogo(file, field)}
          />
        )}

        {step === 3 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Branch Name" value={form.branchName} onChange={(e) => set('branchName', e.target.value)} required /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Address" value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} required /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Area" value={form.area} onChange={(e) => set('area', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Latitude" value={form.lat} onChange={(e) => set('lat', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Longitude" value={form.lng} onChange={(e) => set('lng', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Opens" type="time" value={form.openingTime} onChange={(e) => set('openingTime', e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Closes" type="time" value={form.closingTime} onChange={(e) => set('closingTime', e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid size={{ xs: 12 }}><Typography gutterBottom>Delivery radius: {form.deliveryRadiusKm} km</Typography><Slider value={form.deliveryRadiusKm} min={1} max={50} onChange={(_, v) => set('deliveryRadiusKm', v as number)} /></Grid>
          </Grid>
        )}

        {step === 4 && (
          <Box>
            <Typography mb={1}><strong>{form.name}</strong> → {form.slug}.yourapp.com</Typography>
            <Typography variant="body2">Plan: {selectedPlan?.name || '—'} ({form.billingCycle})</Typography>
            <Typography variant="body2">Owner: {form.ownerName} ({form.ownerEmail})</Typography>
            <Typography variant="body2">Branch: {form.branchName}, {form.addressLine}</Typography>
          </Box>
        )}

        {step === 5 && result && (
          <Alert severity="success">Launched! {result.loginUrl} — Temp password: <strong>{result.tempPassword}</strong></Alert>
        )}

        {step < 5 && (
          <Box display="flex" justifyContent="space-between" mt={3}>
            <Button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < 4 ? (
              <Button
                variant="contained"
                color="primary"
                disabled={!canProceed()}
                onClick={() => {
                  if (!canProceed()) {
                    setError(stepError());
                    return;
                  }
                  setError('');
                  setStep((s) => s + 1);
                }}
              >
                Next
              </Button>
            ) : (
              <Button variant="contained" color="primary" onClick={submit} disabled={!form.planId}>
                Launch Restaurant
              </Button>
            )}
          </Box>
        )}
        {step === 5 && <Button sx={{ mt: 2 }} onClick={() => navigate(`/superadmin/tenants/${result.tenant._id}`)}>View Tenant</Button>}
      </Paper>
    </SuperAdminLayout>
  );
}
