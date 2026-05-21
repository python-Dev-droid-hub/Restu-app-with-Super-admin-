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
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.totalOrders': 'Total Orders',
    'dashboard.menuItems': 'Menu Items',
    'dashboard.branchUsers': 'Branch Users',
    'dashboard.recentOrders': 'Recent Orders',
    'dashboard.viewAll': 'View All',
    'dashboard.noRecentOrders': 'No recent orders',
    
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
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.totalRevenue': 'إجمالي الإيرادات',
    'dashboard.totalOrders': 'إجمالي الطلبات',
    'dashboard.menuItems': 'عناصر القائمة',
    'dashboard.branchUsers': 'مستخدمو الفرع',
    'dashboard.recentOrders': 'الطلبات الأخيرة',
    'dashboard.viewAll': 'عرض الكل',
    'dashboard.noRecentOrders': 'لا توجد طلبات حديثة',
    
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
    
    // Dashboard
    'dashboard.title': 'ڈیش بورڈ',
    'dashboard.totalRevenue': 'کل آمدنی',
    'dashboard.totalOrders': 'کل آرڈرز',
    'dashboard.menuItems': 'مینو اشیاء',
    'dashboard.branchUsers': 'برانچ کے صارفین',
    'dashboard.recentOrders': 'حالیہ آرڈرز',
    'dashboard.viewAll': 'سب دیکھیں',
    'dashboard.noRecentOrders': 'کوئی حالیہ آرڈر نہیں',
    
    // Profile
    'profile.changeImage': 'تصویر تبدیل کریں',
    'profile.changeName': 'نام تبدیل کریں',
    'profile.changePassword': 'پاس ورڈ تبدیل کریں',
    'profile.logout': 'لاگ آؤٹ',
    'profile.administrator': 'ایڈمنسٹریٹر',
    
    // Products
    'products.title': 'پروڈکٹس',
    'products.addProduct': 'پروڈکٹ شامل کریں',
    'products.allProducts': 'تمام پروڈکٹس',
    'products.searchProducts': 'پروڈکٹس تلاش کریں...',
    'products.noProducts': 'کوئی پروڈکٹ نہیں ملی',
    
    // Orders
    'orders.title': 'آرڈرز',
    'orders.pending': 'زیر التوا',
    'orders.processing': 'پروسیسنگ',
    'orders.completed': 'مکمل',
    'orders.cancelled': 'منسوخ',
    
    // Users
    'users.title': 'صارفین',
    'users.allUsers': 'تمام صارفین',
    'users.customers': 'صارفین',
    'users.admins': 'ایڈمنز',
    'users.chefs': 'شیفز',
    'users.waiters': 'ویٹرز',
    'users.riders': 'رائڈرز',
    
    // Branches
    'branches.title': 'شاخیں',
    'branches.total': 'کل شاخیں',
    'branches.active': 'فعال شاخیں',
    'branches.inactive': 'غیر فعال شاخیں',
    
    // Notifications
    'notifications.title': 'اطلاعات',
    'notifications.all': 'تمام',
    'notifications.active': 'فعال',
    'notifications.createNotification': 'اطلاع بنائیں',
    
    // Messages
    'messages.settingsUpdated': 'ترتیبات کامیابی سے اپڈیٹ ہو گئیں',
    'messages.nameUpdated': 'نام کامیابی سے اپڈیٹ ہو گیا',
    'messages.imageUpdated': 'پروفائل تصویر کامیابی سے اپڈیٹ ہو گئی',
    'messages.passwordChanged': 'پاس ورڈ کامیابی سے تبدیل ہو گیا',
    'messages.logoutConfirm': 'کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟',
    'messages.enterValidName': 'براہ کرم ایک درست نام درج کریں',
    'messages.permissionRequired': 'اجازت درکار ہے',
    'messages.allowGallery': 'براہ کرم تصویر اپلوڈ کرنے کے لیے اپنے فوٹو لائبریری تک رسائی کی اجازت دیں۔',
    'messages.allowCamera': 'براہ کرم فوٹو لینے کے لیے اپنے کیمرے تک رسائی کی اجازت دیں۔',
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
    
    // Products
    'products.title': 'Produits',
    'products.addProduct': 'Ajouter un produit',
    'products.allProducts': 'Tous les produits',
    'products.searchProducts': 'Rechercher des produits...',
    'products.noProducts': 'Aucun produit trouvé',
    
    // Orders
    'orders.title': 'Commandes',
    'orders.pending': 'En attente',
    'orders.processing': 'En cours',
    'orders.completed': 'Terminées',
    'orders.cancelled': 'Annulées',
    
    // Users
    'users.title': 'Utilisateurs',
    'users.allUsers': 'Tous les utilisateurs',
    'users.customers': 'Clients',
    'users.admins': 'Admins',
    'users.chefs': 'Chefs',
    'users.waiters': 'Serveurs',
    'users.riders': 'Livreurs',
    
    // Branches
    'branches.title': 'Filiales',
    'branches.total': 'Total des filiales',
    'branches.active': 'Filiales actives',
    'branches.inactive': 'Filiales inactives',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.all': 'Toutes',
    'notifications.active': 'Actives',
    'notifications.createNotification': 'Créer une notification',
    
    // Messages
    'messages.permissionRequired': 'Permission requise',
    'messages.allowGallery': 'Veuillez autoriser l\'accès à votre photothèque pour télécharger une image.',
    'messages.allowCamera': 'Veuillez autoriser l\'accès à votre caméra pour prendre une photo.',
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
    
    // Products
    'products.title': 'Productos',
    'products.addProduct': 'Agregar producto',
    'products.allProducts': 'Todos los productos',
    'products.searchProducts': 'Buscar productos...',
    'products.noProducts': 'No se encontraron productos',
    
    // Orders
    'orders.title': 'Pedidos',
    'orders.pending': 'Pendiente',
    'orders.processing': 'Procesando',
    'orders.completed': 'Completado',
    'orders.cancelled': 'Cancelado',
    
    // Users
    'users.title': 'Usuarios',
    'users.allUsers': 'Todos los usuarios',
    'users.customers': 'Clientes',
    'users.admins': 'Admins',
    'users.chefs': 'Cocineros',
    'users.waiters': 'Meseros',
    'users.riders': 'Repartidores',
    
    // Branches
    'branches.title': 'Sucursales',
    'branches.total': 'Total de sucursales',
    'branches.active': 'Sucursales activas',
    'branches.inactive': 'Sucursales inactivas',
    
    // Notifications
    'notifications.title': 'Notificaciones',
    'notifications.all': 'Todas',
    'notifications.active': 'Activas',
    'notifications.createNotification': 'Crear notificación',
    
    // Messages
    'messages.permissionRequired': 'Permiso requerido',
    'messages.allowGallery': 'Por favor permita el acceso a su galería de fotos para subir una imagen.',
    'messages.allowCamera': 'Por favor permita el acceso a su cámara para tomar una foto.',
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
    
    // Settings
    'settings.title': 'Einstellungen',
    'settings.general': 'Allgemeine Einstellungen',
    'settings.appName': 'App-Name',
    'settings.appVersion': 'App-Version',
    'settings.defaultCurrency': 'Standardwährung',
    'settings.defaultLanguage': 'Standardsprache',
    'settings.taxRate': 'Steuersatz (%)',
    'settings.businessHours': 'Geschäftszeiten',
    'settings.maintenanceMode': 'Wartungsmodus',
    'settings.allowRegistration': 'Registrierung erlauben',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalRevenue': 'Gesamteinnahmen',
    'dashboard.totalOrders': 'Gesamtbestellungen',
    'dashboard.menuItems': 'Menüpunkte',
    'dashboard.branchUsers': 'Filialbenutzer',
    'dashboard.recentOrders': 'Neueste Bestellungen',
    'dashboard.viewAll': 'Alle anzeigen',
    'dashboard.noRecentOrders': 'Keine neuesten Bestellungen',
    
    // Profile
    'profile.changeImage': 'Bild ändern',
    'profile.changeName': 'Name ändern',
    'profile.changePassword': 'Passwort ändern',
    'profile.logout': 'Abmelden',
    'profile.administrator': 'Administrator',
    
    // Products
    'products.title': 'Produkte',
    'products.addProduct': 'Produkt hinzufügen',
    'products.allProducts': 'Alle Produkte',
    'products.searchProducts': 'Produkte suchen...',
    'products.noProducts': 'Keine Produkte gefunden',
    
    // Orders
    'orders.title': 'Bestellungen',
    'orders.pending': 'Ausstehend',
    'orders.processing': 'In Bearbeitung',
    'orders.completed': 'Abgeschlossen',
    'orders.cancelled': 'Storniert',
    
    // Users
    'users.title': 'Benutzer',
    'users.allUsers': 'Alle Benutzer',
    'users.customers': 'Kunden',
    'users.admins': 'Admins',
    'users.chefs': 'Köche',
    'users.waiters': 'Kellner',
    'users.riders': 'Fahrer',
    
    // Branches
    'branches.title': 'Filialen',
    'branches.total': 'Gesamtzahl der Filialen',
    'branches.active': 'Aktive Filialen',
    'branches.inactive': 'Inaktive Filialen',
    
    // Notifications
    'notifications.title': 'Benachrichtigungen',
    'notifications.all': 'Alle',
    'notifications.active': 'Aktiv',
    'notifications.createNotification': 'Benachrichtigung erstellen',
    
    // Messages
    'messages.settingsUpdated': 'Einstellungen erfolgreich aktualisiert',
    'messages.nameUpdated': 'Name erfolgreich aktualisiert',
    'messages.imageUpdated': 'Profilbild erfolgreich aktualisiert',
    'messages.passwordChanged': 'Passwort erfolgreich geändert',
    'messages.logoutConfirm': 'Möchten Sie sich wirklich abmelden?',
    'messages.enterValidName': 'Bitte geben Sie einen gültigen Namen ein',
    'messages.permissionRequired': 'Berechtigung erforderlich',
    'messages.allowGallery': 'Bitte erlauben Sie den Zugriff auf Ihre Fotogalerie, um ein Bild hochzuladen.',
    'messages.allowCamera': 'Bitte erlauben Sie den Zugriff auf Ihre Kamera, um ein Foto aufzunehmen.',
    'messages.takePhoto': 'Foto aufnehmen',
    'messages.chooseFromGallery': 'Aus Galerie wählen',
    'messages.enterName': 'Geben Sie Ihren Namen ein',
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
    
    // Settings
    'settings.title': '设置',
    'settings.general': '常规设置',
    'settings.appName': '应用名称',
    'settings.appVersion': '应用版本',
    'settings.defaultCurrency': '默认货币',
    'settings.defaultLanguage': '默认语言',
    'settings.taxRate': '税率 (%)',
    'settings.businessHours': '营业时间',
    'settings.maintenanceMode': '维护模式',
    'settings.allowRegistration': '允许注册',
    
    // Dashboard
    'dashboard.title': '仪表板',
    'dashboard.totalRevenue': '总收入',
    'dashboard.totalOrders': '总订单',
    'dashboard.menuItems': '菜单项',
    'dashboard.branchUsers': '分店用户',
    'dashboard.recentOrders': '最近订单',
    'dashboard.viewAll': '查看全部',
    'dashboard.noRecentOrders': '没有最近订单',
    
    // Profile
    'profile.changeImage': '更改图片',
    'profile.changeName': '更改名称',
    'profile.changePassword': '更改密码',
    'profile.logout': '登出',
    'profile.administrator': '管理员',
    
    // Products
    'products.title': '产品',
    'products.addProduct': '添加产品',
    'products.allProducts': '所有产品',
    'products.searchProducts': '搜索产品...',
    'products.noProducts': '未找到产品',
    
    // Orders
    'orders.title': '订单',
    'orders.pending': '待处理',
    'orders.processing': '处理中',
    'orders.completed': '已完成',
    'orders.cancelled': '已取消',
    
    // Users
    'users.title': '用户',
    'users.allUsers': '所有用户',
    'users.customers': '客户',
    'users.admins': '管理员',
    'users.chefs': '厨师',
    'users.waiters': '服务员',
    'users.riders': '骑手',
    
    // Branches
    'branches.title': '分店',
    'branches.total': '总分店',
    'branches.active': '活跃分店',
    'branches.inactive': '非活跃分店',
    
    // Notifications
    'notifications.title': '通知',
    'notifications.all': '全部',
    'notifications.active': '活跃',
    'notifications.createNotification': '创建通知',
    
    // Messages
    'messages.settingsUpdated': '设置更新成功',
    'messages.nameUpdated': '名称更新成功',
    'messages.imageUpdated': '头像更新成功',
    'messages.passwordChanged': '密码修改成功',
    'messages.logoutConfirm': '确定要退出登录吗？',
    'messages.enterValidName': '请输入有效的名称',
    'messages.permissionRequired': '需要权限',
    'messages.allowGallery': '请允许访问您的相册以上传图片。',
    'messages.allowCamera': '请允许访问您的相机以拍照。',
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
    
    // Settings
    'settings.title': 'सेटिंग्स',
    'settings.general': 'सामान्य सेटिंग्स',
    'settings.appName': 'ऐप का नाम',
    'settings.appVersion': 'ऐप संस्करण',
    'settings.defaultCurrency': 'डिफ़ॉल्ट मुद्रा',
    'settings.defaultLanguage': 'डिफ़ॉल्ट भाषा',
    'settings.taxRate': 'कर दर (%)',
    'settings.businessHours': 'व्यावसायिक घंटे',
    'settings.maintenanceMode': 'रखरखाव मोड',
    'settings.allowRegistration': 'पंजीकरण की अनुमति दें',
    
    // Dashboard
    'dashboard.title': 'डैशबोर्ड',
    'dashboard.totalRevenue': 'कुल राजस्व',
    'dashboard.totalOrders': 'कुल ऑर्डर',
    'dashboard.menuItems': 'मेनू आइटम',
    'dashboard.branchUsers': 'शाखा उपयोगकर्ता',
    'dashboard.recentOrders': 'हाल के ऑर्डर',
    'dashboard.viewAll': 'सभी देखें',
    'dashboard.noRecentOrders': 'कोई हालिया ऑर्डर नहीं',
    
    // Profile
    'profile.changeImage': 'फोटो बदलें',
    'profile.changeName': 'नाम बदलें',
    'profile.changePassword': 'पासवर्ड बदलें',
    'profile.logout': 'लॉग आउट',
    'profile.administrator': 'प्रशासक',
    
    // Products
    'products.title': 'उत्पाद',
    'products.addProduct': 'उत्पाद जोड़ें',
    'products.allProducts': 'सभी उत्पाद',
    'products.searchProducts': 'उत्पाद खोजें...',
    'products.noProducts': 'कोई उत्पाद नहीं मिला',
    
    // Orders
    'orders.title': 'ऑर्डर',
    'orders.pending': 'लंबित',
    'orders.processing': 'प्रसंस्करण',
    'orders.completed': 'पूर्ण',
    'orders.cancelled': 'रद्द',
    
    // Users
    'users.title': 'उपयोगकर्ता',
    'users.allUsers': 'सभी उपयोगकर्ता',
    'users.customers': 'ग्राहक',
    'users.admins': 'एडमिन',
    'users.chefs': 'शेफ',
    'users.waiters': 'वेटर',
    'users.riders': 'राइडर',
    
    // Branches
    'branches.title': 'शाखाएं',
    'branches.total': 'कुल शाखाएं',
    'branches.active': 'सक्रिय शाखाएं',
    'branches.inactive': 'निष्क्रिय शाखाएं',
    
    // Notifications
    'notifications.title': 'सूचनाएं',
    'notifications.all': 'सभी',
    'notifications.active': 'सक्रिय',
    'notifications.createNotification': 'सूचना बनाएं',
    
    // Messages
    'messages.settingsUpdated': 'सेटिंग्स सफलतापूर्वक अपडेट की गईं',
    'messages.nameUpdated': 'नाम सफलतापूर्वक अपडेट किया गया',
    'messages.imageUpdated': 'प्रोफाइल छवि सफलतापूर्वक अपडेट की गई',
    'messages.passwordChanged': 'पासवर्ड सफलतापूर्वक बदल दिया गया',
    'messages.logoutConfirm': 'क्या आप वास्तव में लॉग आउट करना चाहते हैं?',
    'messages.enterValidName': 'कृपया एक मान्य नाम दर्ज करें',
    'messages.permissionRequired': 'अनुमति आवश्यक',
    'messages.allowGallery': 'कृपया एक छवि अपलोड करने के लिए अपनी फोटो गैलरी तक पहुंच की अनुमति दें।',
    'messages.allowCamera': 'कृपया एक फोटो लेने के लिए अपने कैमरे तक पहुंच की अनुमति दें।',
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
      
      // Second: try to load branch language (set by SettingsContext)
      const branchLang = await AsyncStorage.getItem('branchLanguage');
      if (branchLang && branchLang in translations) {
        setLanguageState(branchLang as LanguageCode);
        return;
      }
      
      // Fallback: try to load from backend settings
      const { getAccessToken } = await import('../utils/secureAuthStorage');
      const authToken = await getAccessToken();
      if (authToken) {
        try {
          // Use the API client instead of direct fetch
          const { api } = await import('../components/api/client');
          const response = await api.get('/settings');
          if (response.success && response.data?.defaultLanguage && response.data.defaultLanguage in translations) {
            const backendLang = response.data.defaultLanguage as LanguageCode;
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
