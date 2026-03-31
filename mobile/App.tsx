import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { LocalizationProvider } from './context/LocalizationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import WelcomeScreen from './screens/auth/WelcomeScreen';
import RoleSelectionScreen from './screens/auth/RoleSelectionScreen';
import LoginScreen from './screens/auth/LoginScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import CustomerDashboard from './screens/dashboards/CustomerDashboard';
import ChefDashboard from './screens/dashboards/ChefDashboard';
import WaiterDashboard from './screens/dashboards/WaiterDashboard';
import RiderDashboard from './screens/dashboards/RiderDashboard';
import AdminDashboard from './screens/dashboards/AdminDashboard';
import AdminOrdersScreen from './screens/admin/AdminOrdersScreen';
import AdminProductsScreen from './screens/admin/AdminProductsScreen';
import AdminUsersScreen from './screens/admin/AdminUsersScreen';
import AdminBranchesScreen from './screens/admin/AdminBranchesScreen';
import AdminReportsScreen from './screens/admin/AdminReportsScreen';
import AdminNotificationsScreen from './screens/admin/AdminNotificationsScreen';
import AdminSettingsScreen from './screens/admin/AdminSettingsScreen';
import AdminDealsScreen from './screens/admin/AdminDealsScreen';
import AdminDealCampaignsScreen from './screens/admin/AdminDealCampaignsScreen';
import AddDealCampaignScreen from './screens/admin/AddDealCampaignScreen';
import AddDealItemScreen from './screens/admin/AddDealItemScreen';
import AdminCouponsScreen from './screens/admin/AdminCouponsScreen';
import AdminProductSizesScreen from './screens/admin/AdminProductSizesScreen';
import AdminCategoriesScreen from './screens/admin/AdminCategoriesScreen';
import AddBranchScreen from './screens/admin/AddBranchScreen';
import AddProductScreen from './screens/admin/AddProductScreen';
import AddCategoryScreen from './screens/admin/AddCategoryScreen';
import UserDetailScreen from './screens/admin/UserDetailScreen';
import AddUserScreen from './screens/admin/AddUserScreen';
import AddCouponScreen from './screens/admin/AddCouponScreen';
import AddDealScreen from './screens/admin/AddDealScreen';
import AddProductSizeScreen from './screens/admin/AddProductSizeScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import ChangePasswordScreen from './screens/auth/ChangePasswordScreen';
import CustomerMenuScreen from './screens/CustomerMenuScreen';
import OrderForm from './screens/waiter/OrderForm';
import EditOrderScreen from './screens/waiter/EditOrderScreen';
import KitchenDisplay from './screens/chef/KitchenDisplay';
import KitchenStats from './screens/chef/KitchenStats';
import KitchenSettingsScreen from './screens/profile/KitchenSettingsScreen';
import TableAssignmentScreen from './screens/admin/TableAssignmentScreen';
import BranchManagementScreen from './screens/admin/BranchManagementScreen';
import CreateBranchScreen from './screens/admin/CreateBranchScreen';
import BranchAuditScreen from './screens/admin/BranchAuditScreen';
import BannerManagementScreen from './screens/admin/BannerManagementScreen';
import ManagerDashboard from './screens/dashboards/ManagerDashboard';
import ManagerMenuScreen from './screens/admin/ManagerMenuScreen';
import SuperAdminDashboard from './screens/dashboards/SuperAdminDashboard';
import DealCampaignScreen from './screens/food-app/DealCampaignScreen';
import RidersManagementScreen from './screens/dashboards/RidersManagementScreen';

// Role-based tab navigators (centralized nav per role)
import AdminTabsNavigator from './navigators/AdminTabsNavigator';
import ManagerTabsNavigator from './navigators/ManagerTabsNavigator';
import SuperAdminTabsNavigator from './navigators/SuperAdminTabsNavigator';
import WaiterTabsNavigator from './navigators/WaiterTabsNavigator';
import ChefTabsNavigator from './navigators/ChefTabsNavigator';
import RiderTabsNavigator from './navigators/RiderTabsNavigator';
import CustomerTabsNavigator from './navigators/CustomerTabsNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <WebSocketProvider>
          <SettingsProvider>
            <CartProvider>
              <LocalizationProvider>
                <NavigationContainer>
                <Stack.Navigator
                  initialRouteName="Welcome"
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: '#1a1a2e',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                      fontWeight: 'bold',
                    },
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="Welcome" component={WelcomeScreen} />
                  <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                  <Stack.Screen name="SignUp" component={SignUpScreen} />
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="AdminDashboard" component={AdminTabsNavigator} />
                  <Stack.Screen name="ManagerTabs" component={ManagerTabsNavigator} options={{ headerShown: false }} />
                  <Stack.Screen name="SuperAdminDashboard" component={SuperAdminTabsNavigator} options={{ headerShown: false }} />
                  <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="AdminBranches" component={AdminBranchesScreen} />
                  <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
                  <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
                  <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
                  <Stack.Screen name="CustomerDashboard" component={CustomerTabsNavigator} />
                  <Stack.Screen name="CustomerMenu" component={CustomerMenuScreen} />
                  <Stack.Screen name="ChefDashboard" component={ChefTabsNavigator} />
                  <Stack.Screen name="WaiterDashboard" component={WaiterTabsNavigator} />
                  <Stack.Screen name="RiderDashboard" component={RiderDashboard} />
                  <Stack.Screen name="AdminDeals" component={AdminDealsScreen} />
                  <Stack.Screen name="AdminDealCampaigns" component={AdminDealCampaignsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="AddDealCampaign" component={AddDealCampaignScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="AddDealItem" component={AddDealItemScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="AdminCoupons" component={AdminCouponsScreen} />
                  <Stack.Screen name="AdminProductSizes" component={AdminProductSizesScreen} />
                  <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} />
                  <Stack.Screen name="AddBranch" component={AddBranchScreen} />
                  <Stack.Screen name="AddProduct" component={AddProductScreen} />
                  <Stack.Screen name="AddCategory" component={AddCategoryScreen} />
                  <Stack.Screen name="UserDetail" component={UserDetailScreen} />
                  <Stack.Screen name="AddUser" component={AddUserScreen} />
                  <Stack.Screen name="AddCoupon" component={AddCouponScreen} />
                  <Stack.Screen name="AddDeal" component={AddDealScreen} />
                  <Stack.Screen name="AddProductSize" component={AddProductSizeScreen} />
                  <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                  <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                  <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
                  <Stack.Screen name="OrderForm" component={OrderForm} />
                  <Stack.Screen name="EditOrder" component={EditOrderScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="KitchenDisplay" component={KitchenDisplay} />
                  <Stack.Screen name="KitchenStats" component={KitchenStats} />
                  <Stack.Screen name="KitchenSettings" component={KitchenSettingsScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="TableAssignment" component={TableAssignmentScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="BranchManagement" component={BranchManagementScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="CreateBranch" component={CreateBranchScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="BranchAudit" component={BranchAuditScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="BannerManagement" component={BannerManagementScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="RidersManagement" component={RidersManagementScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="DealCampaign" component={DealCampaignScreen} options={{ headerShown: false }} />
                </Stack.Navigator>
                <Toast />
              </NavigationContainer>
            </LocalizationProvider>
          </CartProvider>
        </SettingsProvider>
        </WebSocketProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
