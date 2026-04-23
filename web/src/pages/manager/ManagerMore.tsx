import React from 'react';
import { Box, Card, CardActionArea, CardContent, Container, Grid, Typography } from '@mui/material';
import { Apps, BarChart, Category, Fastfood, Image, LocalOffer, Notifications, Sell, Settings, TwoWheeler } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

type MoreItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

const ManagerMore: React.FC = () => {
  const navigate = useNavigate();

  const items: MoreItem[] = [
    { label: 'Notifications', icon: <Notifications sx={{ fontSize: 22 }} />, path: '/manager/notifications' },
    { label: 'Table Assignment', icon: <Apps sx={{ fontSize: 22 }} />, path: '/manager/table-assignment' },
    { label: 'Riders', icon: <TwoWheeler sx={{ fontSize: 22 }} />, path: '/manager/riders' },
    { label: 'Categories', icon: <Category sx={{ fontSize: 22 }} />, path: '/manager/categories' },
    { label: 'Products', icon: <Fastfood sx={{ fontSize: 22 }} />, path: '/manager/products' },
    { label: 'Banner Management', icon: <Image sx={{ fontSize: 22 }} />, path: '/manager/banners' },
    { label: 'Coupons', icon: <LocalOffer sx={{ fontSize: 22 }} />, path: '/manager/coupons' },
    { label: 'Deals', icon: <Sell sx={{ fontSize: 22 }} />, path: '/manager/deals' },
    { label: 'Reports', icon: <BarChart sx={{ fontSize: 22 }} />, path: '/manager/reports' },
    { label: 'Settings', icon: <Settings sx={{ fontSize: 22 }} />, path: '/manager/settings' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 28 }, color: '#111' }}>
          More
        </Typography>
        <Typography sx={{ color: '#666', mt: 0.25 }}>
          Management tools
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {items.map((item) => (
          <Grid key={item.path} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 10px 30px rgba(20,20,40,0.08)' }}>
              <CardActionArea onClick={() => navigate(item.path)} sx={{ p: 0.25 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2.5, bgcolor: '#FFE8E0', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, color: '#111' }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ color: '#777', fontSize: 12 }}>
                      Open
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default ManagerMore;

