import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Translation strings
const translations: Record<string, Record<string, string>> = {
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    
    // Navigation
    'nav.home': 'Home',
    'nav.orders': 'Orders',
    'nav.menu': 'Menu',
    'nav.users': 'Users',
    'nav.more': 'More',
    'nav.branches': 'Branches',
    'nav.deals': 'Deals',
    'nav.coupons': 'Coupons',
    'nav.categories': 'Categories',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.notifications': 'Notifications',
    'nav.productSizes': 'Product Sizes',
    
    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General Settings',
    'settings.appName': 'App Name',
    'settings.appVersion': 'App Version',
    'settings.defaultCurrency': 'Default Currency',
    'settings.defaultLanguage': 'Default Language',
    'settings.taxRate': 'Tax Rate (%)',
    'settings.businessHours': 'Business Hours',
    'settings.maintenanceMode': 'Maintenance Mode',
    'settings.allowRegistration': 'Allow Registration',
    
    // Profile
    'profile.changeImage': 'Change Image',
    'profile.changeName': 'Change Name',
    'profile.changePassword': 'Change Password',
    'profile.logout': 'Logout',
    'profile.administrator': 'Administrator',
    
    // Products
    'products.title': 'Products',
    'products.addProduct': 'Add Product',
    'products.allProducts': 'All Products',
    'products.searchProducts': 'Search products...',
    'products.noProducts': 'No products found',
    
    // Orders
    'orders.title': 'Orders',
    'orders.pending': 'Pending',
    'orders.processing': 'Processing',
    'orders.completed': 'Completed',
    'orders.cancelled': 'Cancelled',
    
    // Users
    'users.title': 'Users',
    'users.allUsers': 'All Users',
    'users.customers': 'Customers',
    'users.admins': 'Admins',
    'users.chefs': 'Chefs',
    'users.waiters': 'Waiters',
    'users.riders': 'Riders',
    
    // Branches
    'branches.title': 'Branches',
    'branches.total': 'Total Branches',
    'branches.active': 'Active Branches',
    'branches.inactive': 'Inactive Branches',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.all': 'All',
    'notifications.active': 'Active',
    'notifications.createNotification': 'Create Notification',
    
    // Messages
    'messages.settingsUpdated': 'Settings updated successfully',
    'messages.nameUpdated': 'Name updated successfully',
    'messages.imageUpdated': 'Profile image updated successfully',
    'messages.passwordChanged': 'Your password has been changed successfully',
    'messages.logoutConfirm': 'Are you sure you want to logout?',
    'messages.enterValidName': 'Please enter a valid name',
    'messages.permissionRequired': 'Permission Required',
    'messages.allowGallery': 'Please allow access to your photo library to upload an image.',
    'messages.allowCamera': 'Please allow access to your camera to take a photo.',
    'messages.takePhoto': 'Take Photo',
    'messages.chooseFromGallery': 'Choose from Gallery',
    'messages.enterName': 'Enter your name',
  },
  ar: {
    // Common
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.search': 'بحث',
    'common.loading': 'جاري التحميل...',
    'common.success': 'نجاح',
    'common.error': 'خطأ',
    'common.confirm': 'تأكيد',
    'common.back': 'رجوع',
    
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.orders': 'الطلبات',
    'nav.menu': 'القائمة',
    'nav.users': 'المستخدمين',
    'nav.more': 'المزيد',
    'nav.branches': 'الفروع',
    'nav.deals': 'العروض',
    'nav.coupons': 'القسائم',
    'nav.categories': 'الفئات',
    'nav.reports': 'التقارير',
    'nav.settings': 'الإعدادات',
    'nav.notifications': 'الإشعارات',
    'nav.productSizes': 'أحجام المنتجات',
    
    // Settings
    'settings.title': 'الإعدادات',
    'settings.general': 'الإعدادات العامة',
    'settings.appName': 'اسم التطبيق',
    'settings.appVersion': 'إصدار التطبيق',
    'settings.defaultCurrency': 'العملة الافتراضية',
    'settings.defaultLanguage': 'اللغة الافتراضية',
    'settings.taxRate': 'نسبة الضريبة (%)',
    'settings.businessHours': 'ساعات العمل',
    'settings.maintenanceMode': 'وضع الصيانة',
    'settings.allowRegistration': 'السماح بالتسجيل',
    
    // Profile
    'profile.changeImage': 'تغيير الصورة',
    'profile.changeName': 'تغيير الاسم',
    'profile.changePassword': 'تغيير كلمة المرور',
    'profile.logout': 'تسجيل الخروج',
    'profile.administrator': 'مدير النظام',
    
    // Products
    'products.title': 'المنتجات',
    'products.addProduct': 'إضافة منتج',
    'products.allProducts': 'جميع المنتجات',
    'products.searchProducts': 'البحث عن منتجات...',
    'products.noProducts': 'لا توجد منتجات',
    
    // Orders
    'orders.title': 'الطلبات',
    'orders.pending': 'قيد الانتظار',
    'orders.processing': 'قيد المعالجة',
    'orders.completed': 'مكتملة',
    'orders.cancelled': 'ملغاة',
    
    // Users
    'users.title': 'المستخدمين',
    'users.allUsers': 'جميع المستخدمين',
    'users.customers': 'العملاء',
    'users.admins': 'المدراء',
    'users.chefs': 'الطهاة',
    'users.waiters': 'الندل',
    'users.riders': 'السائقين',
    
    // Branches
    'branches.title': 'الفروع',
    'branches.total': 'إجمالي الفروع',
    'branches.active': 'الفروع النشطة',
    'branches.inactive': 'الفروع غير النشطة',
    
    // Notifications
    'notifications.title': 'الإشعارات',
    'notifications.all': 'الكل',
    'notifications.active': 'نشط',
    'notifications.createNotification': 'إنشاء إشعار',
    
    // Messages
    'messages.settingsUpdated': 'تم تحديث الإعدادات بنجاح',
    'messages.nameUpdated': 'تم تحديث الاسم بنجاح',
    'messages.imageUpdated': 'تم تحديث صورة الملف الشخصي بنجاح',
    'messages.passwordChanged': 'تم تغيير كلمة المرور بنجاح',
    'messages.logoutConfirm': 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
    'messages.enterValidName': 'الرجاء إدخال اسم صالح',
    'messages.permissionRequired': 'إذن مطلوب',
    'messages.allowGallery': 'الرجاء السماح بالوصول إلى مكتبة الصور الخاصة بك لتحميل صورة.',
    'messages.allowCamera': 'الرجاء السماح بالوصول إلى الكاميرا الخاصة بك لالتقاط صورة.',
    'messages.takePhoto': 'التقاط صورة',
    'messages.chooseFromGallery': 'اختر من المعرض',
    'messages.enterName': 'أدخل اسمك',
  },
  ur: {
    // Common
    'common.save': 'محفوظ کریں',
    'common.cancel': 'منسوخ',
    'common.delete': 'حذف',
    'common.edit': 'ترمیم',
    'common.add': 'شامل کریں',
    'common.search': 'تلاش',
    'common.loading': 'لوڈ ہو رہا ہے...',
    'common.success': 'کامیاب',
    'common.error': 'خرابی',
    'common.confirm': 'تصدیق',
    'common.back': 'واپس',
    
    // Navigation
    'nav.home': 'ہوم',
    'nav.orders': 'آرڈرز',
    'nav.menu': 'مینو',
    'nav.users': 'صارفین',
    'nav.more': 'مزید',
    'nav.branches': 'شاخیں',
    'nav.deals': 'ڈیلز',
    'nav.coupons': 'کوپنز',
    'nav.categories': 'زمرے',
    'nav.reports': 'رپورٹس',
    'nav.settings': 'ترتیبات',
    'nav.notifications': 'اطلاعات',
    'nav.productSizes': 'پروڈکٹ سائز',
    
    // Settings
    'settings.title': 'ترتیبات',
    'settings.general': 'عام ترتیبات',
    'settings.appName': 'ایپ کا نام',
    'settings.appVersion': 'ایپ ورژن',
    'settings.defaultCurrency': 'پہلے سے طے شدہ کرنسی',
    'settings.defaultLanguage': 'پہلے سے طے شدہ زبان',
    'settings.taxRate': 'ٹیکس کی شرح (%)',
    'settings.businessHours': 'کاروباری اوقات',
    'settings.maintenanceMode': 'دیکھ بھال موڈ',
    'settings.allowRegistration': 'رجسٹریشن کی اجازت',
    
    // Profile
    'profile.changeImage': 'تصویر تبدیل کریں',
    'profile.changeName': 'نام تبدیل کریں',
    'profile.changePassword': 'پاس ورڈ تبدیل کریں',
    'profile.logout': 'لاگ آؤٹ',
    'profile.administrator': 'ایڈمنسٹریٹر',
    
    // Messages
    'messages.settingsUpdated': 'ترتیبات کامیابی سے اپڈیٹ ہو گئیں',
    'messages.nameUpdated': 'نام کامیابی سے اپڈیٹ ہو گیا',
    'messages.imageUpdated': 'پروفائل تصویر کامیابی سے اپڈیٹ ہو گئی',
    'messages.passwordChanged': 'پاس ورڈ کامیابی سے تبدیل ہو گیا',
    'messages.logoutConfirm': 'کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟',
  },
  fr: {
    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.success': 'Succès',
    'common.error': 'Erreur',
    'common.confirm': 'Confirmer',
    'common.back': 'Retour',
    
    // Navigation
    'nav.home': 'Accueil',
    'nav.orders': 'Commandes',
    'nav.menu': 'Menu',
    'nav.users': 'Utilisateurs',
    'nav.more': 'Plus',
    'nav.branches': 'Filiale',
    'nav.deals': 'Offres',
    'nav.coupons': 'Coupons',
    'nav.categories': 'Catégories',
    'nav.reports': 'Rapports',
    'nav.settings': 'Paramètres',
    'nav.notifications': 'Notifications',
    'nav.productSizes': 'Tailles des produits',
    
    // Settings
    'settings.title': 'Paramètres',
    'settings.general': 'Paramètres généraux',
    'settings.appName': "Nom de l'application",
    'settings.appVersion': "Version de l'application",
    'settings.defaultCurrency': 'Devise par défaut',
    'settings.defaultLanguage': 'Langue par défaut',
    'settings.taxRate': 'Taux de taxe (%)',
    'settings.businessHours': 'Heures d\'ouverture',
    'settings.maintenanceMode': 'Mode maintenance',
    'settings.allowRegistration': 'Autoriser l\'inscription',
    
    // Profile
    'profile.changeImage': 'Changer l\'image',
    'profile.changeName': 'Changer le nom',
    'profile.changePassword': 'Changer le mot de passe',
    'profile.logout': 'Déconnexion',
    'profile.administrator': 'Administrateur',
    
    // Messages
    'messages.settingsUpdated': 'Paramètres mis à jour avec succès',
    'messages.nameUpdated': 'Nom mis à jour avec succès',
    'messages.imageUpdated': 'Image de profil mise à jour avec succès',
    'messages.passwordChanged': 'Mot de passe changé avec succès',
    'messages.takePhoto': 'Prendre une photo',
    'messages.chooseFromGallery': 'Choisir dans la galerie',
    'messages.enterName': 'Entrez votre nom',
  },
  es: {
    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Agregar',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.success': 'Éxito',
    'common.error': 'Error',
    'common.confirm': 'Confirmar',
    'common.back': 'Volver',
    
    // Navigation
    'nav.home': 'Inicio',
    'nav.orders': 'Pedidos',
    'nav.menu': 'Menú',
    'nav.users': 'Usuarios',
    'nav.more': 'Más',
    'nav.branches': 'Sucursales',
    'nav.deals': 'Ofertas',
    'nav.coupons': 'Cupones',
    'nav.categories': 'Categorías',
    'nav.reports': 'Informes',
    'nav.settings': 'Configuración',
    'nav.notifications': 'Notificaciones',
    'nav.productSizes': 'Tamaños de producto',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.general': 'Configuración general',
    'settings.appName': 'Nombre de la aplicación',
    'settings.appVersion': 'Versión de la aplicación',
    'settings.defaultCurrency': 'Moneda predeterminada',
    'settings.defaultLanguage': 'Idioma predeterminado',
    'settings.taxRate': 'Tasa de impuesto (%)',
    'settings.businessHours': 'Horario comercial',
    'settings.maintenanceMode': 'Modo de mantenimiento',
    'settings.allowRegistration': 'Permitir registro',
    
    // Profile
    'profile.changeImage': 'Cambiar imagen',
    'profile.changeName': 'Cambiar nombre',
    'profile.changePassword': 'Cambiar contraseña',
    'profile.logout': 'Cerrar sesión',
    'profile.administrator': 'Administrador',
    
    // Messages
    'messages.settingsUpdated': 'Configuración actualizada con éxito',
    'messages.nameUpdated': 'Nombre actualizado con éxito',
    'messages.imageUpdated': 'Imagen de perfil actualizada con éxito',
    'messages.passwordChanged': 'Contraseña cambiada con éxito',
    'messages.takePhoto': 'Tomar foto',
    'messages.chooseFromGallery': 'Elegir de la galería',
    'messages.enterName': 'Ingrese su nombre',
  },
  de: {
    // Common
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.add': 'Hinzufügen',
    'common.search': 'Suchen',
    'common.loading': 'Laden...',
    'common.success': 'Erfolg',
    'common.error': 'Fehler',
    'common.confirm': 'Bestätigen',
    'common.back': 'Zurück',
    
    // Navigation
    'nav.home': 'Startseite',
    'nav.orders': 'Bestellungen',
    'nav.menu': 'Menü',
    'nav.users': 'Benutzer',
    'nav.more': 'Mehr',
    'nav.branches': 'Filialen',
    'nav.deals': 'Angebote',
    'nav.coupons': 'Gutscheine',
    'nav.categories': 'Kategorien',
    'nav.reports': 'Berichte',
    'nav.settings': 'Einstellungen',
    'nav.notifications': 'Benachrichtigungen',
    'nav.productSizes': 'Produktgrößen',
    
    // Profile
    'profile.changeImage': 'Bild ändern',
    'profile.changeName': 'Name ändern',
    'profile.changePassword': 'Passwort ändern',
    'profile.logout': 'Abmelden',
    'profile.administrator': 'Administrator',
  },
  zh: {
    // Common
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.add': '添加',
    'common.search': '搜索',
    'common.loading': '加载中...',
    'common.success': '成功',
    'common.error': '错误',
    'common.confirm': '确认',
    'common.back': '返回',
    
    // Navigation
    'nav.home': '首页',
    'nav.orders': '订单',
    'nav.menu': '菜单',
    'nav.users': '用户',
    'nav.more': '更多',
    'nav.branches': '分店',
    'nav.deals': '优惠',
    'nav.coupons': '优惠券',
    'nav.categories': '分类',
    'nav.reports': '报告',
    'nav.settings': '设置',
    'nav.notifications': '通知',
    'nav.productSizes': '产品尺寸',
    
    // Profile
    'profile.changeImage': '更改图片',
    'profile.changeName': '更改名称',
    'profile.changePassword': '更改密码',
    'profile.logout': '登出',
    'messages.takePhoto': '拍照',
    'messages.chooseFromGallery': '从图库选择',
    'messages.enterName': '输入您的姓名',
  },
  hi: {
    // Common
    'common.save': 'सेव करें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.add': 'जोड़ें',
    'common.search': 'खोजें',
    'common.loading': 'लोड हो रहा है...',
    'common.success': 'सफल',
    'common.error': 'त्रुटि',
    'common.confirm': 'पुष्टि करें',
    'common.back': 'वापस',
    
    // Navigation
    'nav.home': 'होम',
    'nav.orders': 'ऑर्डर',
    'nav.menu': 'मेनू',
    'nav.users': 'उपयोगकर्ता',
    'nav.more': 'अधिक',
    'nav.branches': 'शाखाएं',
    'nav.deals': 'डील',
    'nav.coupons': 'कूपन',
    'nav.categories': 'श्रेणियां',
    'nav.reports': 'रिपोर्ट',
    'nav.settings': 'सेटिंग्स',
    'nav.notifications': 'सूचनाएं',
    'nav.productSizes': 'उत्पाद आकार',
    
    // Profile
    'profile.changeImage': 'फोटो बदलें',
    'profile.changeName': 'नाम बदलें',
    'profile.changePassword': 'पासवर्ड बदलें',
    'profile.logout': 'लॉग आउट',
    'messages.takePhoto': 'फोटो लें',
    'messages.chooseFromGallery': 'गैलरी से चुनें',
    'messages.enterName': 'अपना नाम दर्ज करें',
  },
};

type LanguageCode = keyof typeof translations;

interface LocalizationContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      // First try to load from AsyncStorage (user's explicit choice)
      const saved = await AsyncStorage.getItem('appLanguage');
      if (saved && saved in translations) {
        setLanguageState(saved as LanguageCode);
        return;
      }
      
      // Fallback: try to load from backend settings
      const authToken = await AsyncStorage.getItem('authToken');
      if (authToken) {
        try {
          const response = await fetch('http://localhost:5000/api/settings', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          });
          const data = await response.json();
          if (data.success && data.data?.defaultLanguage && data.data.defaultLanguage in translations) {
            const backendLang = data.data.defaultLanguage as LanguageCode;
            setLanguageState(backendLang);
            await AsyncStorage.setItem('appLanguage', backendLang);
          }
        } catch (apiError) {
          console.error('Error loading language from backend:', apiError);
        }
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const setLanguage = async (lang: LanguageCode) => {
    try {
      await AsyncStorage.setItem('appLanguage', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    const langTranslations = translations[language] || translations.en;
    return langTranslations[key] || translations.en[key] || key;
  };

  const isRTL = language === 'ar' || language === 'ur';

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}

export type { LanguageCode };
export { translations };
